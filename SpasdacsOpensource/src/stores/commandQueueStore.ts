/**
 * commandQueueStore.ts
 * Reactive singleton — no Pinia required.
 * Holds the ordered list of telecommands the operator has staged for dispatch.
 */
import { reactive } from "vue";

export interface QueuedCommand {
  /** Unique instance id (so the same cmdDesc can appear multiple times) */
  uid:      string;
  /** The command descriptor string e.g. "PHASE_METER_MNT_RATE_SECS" */
  cmdDesc:  string;
  /** Selected data-part value — empty string when the command has no dataPart */
  dataPart: string;
}

let _uid = 0;
function newUid() { return `cq-${Date.now()}-${_uid++}`; }

export const commandQueue = reactive<{ items: QueuedCommand[] }>({ items: [] });

/** Append one or more commands to the queue */
export function enqueueCommands(cmds: Omit<QueuedCommand, "uid">[]) {
  for (const c of cmds) {
    commandQueue.items.push({ uid: newUid(), ...c });
  }
}

/** Remove a single item by uid */
export function dequeueCommand(uid: string) {
  const idx = commandQueue.items.findIndex(c => c.uid === uid);
  if (idx !== -1) commandQueue.items.splice(idx, 1);
}

/** Move item at index `from` to index `to` */
export function reorderCommand(from: number, to: number) {
  if (from === to) return;
  const items = commandQueue.items;
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
}

/** Wipe the entire queue */
export function clearQueue() {
  commandQueue.items.splice(0);
}
