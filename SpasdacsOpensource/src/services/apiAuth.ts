import { useAuth } from "./auth";

const KEYCLOAK_URL = (import.meta.env.VITE_KEYCLOAK_URL as string | undefined) ?? "http://localhost:8080";

function buildAllowedOrigins(): string[] {
  const configuredBases = [
    import.meta.env.VITE_DIAGRAM_API_URL as string | undefined,
    import.meta.env.VITE_GATEWAY_URL as string | undefined,
  ].filter((v): v is string => Boolean(v));

  const defaultGatewayHost = import.meta.env.DEV ? window.location.hostname : window.location.host;
  configuredBases.push(`http://${defaultGatewayHost}/api/go/v1`);

  const origins = new Set<string>([window.location.origin]);
  for (const base of configuredBases) {
    try {
      origins.add(new URL(base, window.location.origin).origin);
    } catch {
      // ignore malformed configured base
    }
  }

  try {
    origins.delete(new URL(KEYCLOAK_URL).origin);
  } catch {
    // ignore malformed KEYCLOAK_URL
  }

  return [...origins];
}

const allowedOrigins = buildAllowedOrigins();
const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  let requestOrigin = "";
  try {
    requestOrigin = new URL(rawUrl, window.location.origin).origin;
  } catch {
    // relative/invalid URL — fall through, treat as not matching
  }

  if (allowedOrigins.includes(requestOrigin)) {
    const auth = useAuth();
    await auth.restoreSession();
    if (auth.isLoggedIn && auth.accessToken) {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${auth.accessToken}`);
      return originalFetch(input, { ...init, headers });
    }
  }

  return originalFetch(input, init);
};
