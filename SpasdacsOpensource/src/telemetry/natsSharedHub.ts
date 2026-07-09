import { connect, Empty, StringCodec, type NatsConnection, type Subscription } from "nats.ws";
import type { NatsTelemetryStream } from "../types";

export interface SharedNatsConfig {
  serverUrl: string;
  prefix: string;
  username?: string;
  password?: string;
  streams: NatsTelemetryStream[];
}

interface SharedNatsConsumer {
  onMessage: (subject: string, payloadText: string) => void;
  onConnection: (connected: boolean) => void;
}

function subject(prefix: string, suffix: string): string {
  if (!prefix) return suffix;
  return `${prefix}.${suffix}`;
}

function expandedStreamSuffixes(stream: NatsTelemetryStream): string[] {
  const out = new Set<string>();
  for (const raw of stream.subjectSuffixes ?? []) {
    const suffix = raw.trim();
    if (!suffix) continue;
    out.add(suffix);
    if (suffix.endsWith("/full")) {
      const live = suffix.slice(0, -"/full".length);
      if (live) out.add(live);
    }
  }
  return Array.from(out);
}

class SharedNatsHub {
  private client: NatsConnection | null = null;
  private subscriptions: Subscription[] = [];
  private consumers = new Map<number, SharedNatsConsumer>();
  private nextConsumerId = 1;
  private signature = "";
  private connected = false;
  private connectToken = 0;

  async attach(config: SharedNatsConfig, consumer: SharedNatsConsumer): Promise<() => void> {
    const id = this.nextConsumerId++;
    this.consumers.set(id, consumer);

    try {
      await this.ensureConnected(config);
    } catch {
      consumer.onConnection(false);
    }

    consumer.onConnection(this.connected);

    if (this.connected) {
      await this.sendSnapshotsToConsumer(config, consumer);
    }

    return () => {
      this.consumers.delete(id);
      if (this.consumers.size === 0) {
        void this.shutdown();
      }
    };
  }

  private makeSignature(config: SharedNatsConfig): string {
    return JSON.stringify({
      url: config.serverUrl,
      prefix: config.prefix,
      username: config.username ?? "",
      password: config.password ?? "",
      streams: config.streams.map((s) => ({ id: s.id, suffixes: expandedStreamSuffixes(s) })),
    });
  }

  private async ensureConnected(config: SharedNatsConfig): Promise<void> {
    const sig = this.makeSignature(config);
    if (this.client && this.connected && sig === this.signature) return;

    await this.shutdown();
    this.signature = sig;

    const token = ++this.connectToken;
    const opts: { servers: string; user?: string; pass?: string } = { servers: config.serverUrl };
    if (config.username?.trim()) opts.user = config.username;
    if (config.password?.trim()) opts.pass = config.password;

    const conn = await connect(opts);
    if (token !== this.connectToken) {
      void conn.drain().catch(() => conn.close());
      return;
    }

    this.client = conn;
    this.connected = true;
    this.broadcastConnection(true);

    const prefix = config.prefix.trim();
    const sc = StringCodec();

    for (const stream of config.streams) {
      for (const suffix of expandedStreamSuffixes(stream)) {
        if (suffix.endsWith("/full")) continue;
        const sub = conn.subscribe(subject(prefix, suffix));
        this.subscriptions.push(sub);
        void (async () => {
          try {
            for await (const msg of sub) {
              this.broadcastMessage(msg.subject, sc.decode(msg.data));
            }
          } catch {
            // no-op
          }
        })();
      }
    }

    const hbSub = conn.subscribe(subject(prefix, "heartbeat"));
    this.subscriptions.push(hbSub);
    void (async () => {
      try {
        for await (const msg of hbSub) {
          this.broadcastMessage(msg.subject, sc.decode(msg.data));
        }
      } catch {
        // no-op
      }
    })();

    void this.monitorConnection(token);
  }

  private async sendSnapshotsToConsumer(config: SharedNatsConfig, consumer: SharedNatsConsumer): Promise<void> {
    if (!this.client) return;
    const prefix = config.prefix.trim();
    const sc = StringCodec();

    for (const stream of config.streams) {
      for (const suffix of expandedStreamSuffixes(stream)) {
        if (!suffix.endsWith("/full")) continue;
        const reqSubject = subject(prefix, suffix);
        try {
          const reply = await this.client.request(reqSubject, Empty, { timeout: 10_000 });
          const liveSubject = reqSubject.endsWith("/full")
            ? reqSubject.slice(0, -"/full".length)
            : reqSubject;
          consumer.onMessage(liveSubject, sc.decode(reply.data));
        } catch {
          // Best-effort snapshot only.
        }
      }
    }
  }

  private async monitorConnection(token: number): Promise<void> {
    if (!this.client) return;
    try {
      for await (const s of this.client.status()) {
        if (token !== this.connectToken) return;
        if (s.type === "reconnect") {
          this.connected = true;
          this.broadcastConnection(true);
        }
        if (s.type === "disconnect" || s.type === "error") {
          this.connected = false;
          this.broadcastConnection(false);
        }
      }
    } catch {
      if (token === this.connectToken) {
        this.connected = false;
        this.broadcastConnection(false);
      }
    }
  }

  private broadcastMessage(subjectName: string, payloadText: string): void {
    for (const consumer of this.consumers.values()) {
      consumer.onMessage(subjectName, payloadText);
    }
  }

  private broadcastConnection(connected: boolean): void {
    for (const consumer of this.consumers.values()) {
      consumer.onConnection(connected);
    }
  }

  private async shutdown(): Promise<void> {
    this.connectToken++;
    this.connected = false;
    for (const sub of this.subscriptions) {
      try { sub.unsubscribe(); } catch { /* no-op */ }
    }
    this.subscriptions = [];

    const clientRef = this.client;
    this.client = null;
    if (clientRef) {
      await clientRef.drain().catch(() => clientRef.close());
    }
  }
}

const sharedHub = new SharedNatsHub();

export function getSharedNatsHub(): SharedNatsHub {
  return sharedHub;
}
