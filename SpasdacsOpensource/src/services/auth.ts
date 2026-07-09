import { reactive } from "vue";

export type RoleName = "super_admin" | "admin" | "operator" | "viewer" | string;

export interface AuthUser {
  id?: string;
  username?: string;
  full_name?: string;
  email?: string;
  roles?: RoleName[];
}

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser | null;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user?: AuthUser;
}

interface RefreshResponse {
  access_token: string;
  expires_in: number;
}

const STORAGE_KEY = "spasdacs-auth-v1";

const state = reactive<{
  session: StoredSession | null;
}>({
  session: readStorage(),
});

function readStorage(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.accessToken || !parsed?.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(session: StoredSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function setSession(next: StoredSession | null) {
  state.session = next;
  writeStorage(next);
}

function baseApiRoot() {
  if (typeof window === "undefined") return "";
  const host = import.meta.env.DEV ? window.location.hostname : window.location.host;
  return `${window.location.protocol}//${host}/iam/api/v1`;
}

function candidateUrls(path: string): string[] {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const root = baseApiRoot();
  if (!root) return [];

  if (normalized.startsWith("/iam/")) {
    return [`${root}${normalized}`];
  }

  return [`${root}/iam${normalized}`, `${root}${normalized}`];
}

async function fetchWithFallback<T>(path: string, options: RequestInit): Promise<T> {
  const urls = candidateUrls(path);
  let lastErr: unknown;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });

      if (!res.ok) {
        const text = await res.text();
        const maybeJson = tryParseJson(text);
        const err: any = new Error(maybeJson?.error || text || `HTTP ${res.status}`);
        err.status = res.status;
        err.data = maybeJson;
        throw err;
      }

      return (await res.json()) as T;
    } catch (err: any) {
      lastErr = err;
      const status = Number(err?.status ?? 0);
      if (status !== 404 && status !== 405) {
        throw err;
      }
    }
  }

  throw lastErr ?? new Error("IAM request failed");
}

function tryParseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function tokenExpiringSoon() {
  const exp = state.session?.expiresAt ?? 0;
  return Date.now() + 20_000 >= exp;
}

export function useAuth() {
  function restoreSession() {
    if (!state.session) {
      state.session = readStorage();
    }
  }

  function clearSession() {
    setSession(null);
  }

  async function login(username: string, password: string) {
    const resp = await fetchWithFallback<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    setSession({
      accessToken: resp.access_token,
      refreshToken: resp.refresh_token,
      expiresAt: Date.now() + Math.max(5, resp.expires_in) * 1000,
      user: resp.user ?? null,
    });

    return resp.user ?? null;
  }

  async function refreshIfNeeded(force = false) {
    if (!state.session?.refreshToken) return false;
    if (!force && !tokenExpiringSoon()) return true;

    const resp = await fetchWithFallback<RefreshResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: state.session.refreshToken }),
    });

    setSession({
      accessToken: resp.access_token,
      refreshToken: state.session.refreshToken,
      expiresAt: Date.now() + Math.max(5, resp.expires_in) * 1000,
      user: state.session.user,
    });

    return true;
  }

  async function logout() {
    const s = state.session;
    if (s?.refreshToken && s?.accessToken) {
      try {
        await fetchWithFallback("/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${s.accessToken}` },
          body: JSON.stringify({ refresh_token: s.refreshToken }),
        });
      } catch {
        // Ignore transport failure; local session will still be cleared.
      }
    }
    clearSession();
  }

  function hasAnyRole(roles: RoleName[]) {
    const userRoles = state.session?.user?.roles ?? [];
    return roles.some((r) => userRoles.includes(r));
  }

  return {
    session: state,
    get isLoggedIn() {
      return Boolean(state.session?.accessToken);
    },
    get user() {
      return state.session?.user ?? null;
    },
    restoreSession,
    login,
    logout,
    refreshIfNeeded,
    clearSession,
    hasAnyRole,
  };
}
