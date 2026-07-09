import { reactive } from "vue";
import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";

export type RoleName = "super_admin" | "admin" | "operator" | "viewer" | string;

export interface AuthUser {
  id?: string;
  username?: string;
  full_name?: string;
  email?: string;
  roles?: RoleName[];
}

const KEYCLOAK_URL = (import.meta.env.VITE_KEYCLOAK_URL as string | undefined) ?? "http://localhost:8080";
const KEYCLOAK_REALM = (import.meta.env.VITE_KEYCLOAK_REALM as string | undefined) ?? "scg";
const KEYCLOAK_CLIENT_ID = (import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string | undefined) ?? "spasdacs-spa";

function redirectUri(): string {
  return `${window.location.origin}/spasdacs/`;
}

export const userManager = new UserManager({
  authority: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
  client_id: KEYCLOAK_CLIENT_ID,
  redirect_uri: redirectUri(),
  post_logout_redirect_uri: redirectUri(),
  response_type: "code",
  scope: "openid profile email",
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  automaticSilentRenew: true,
});

// ponytail: Keycloak's ID token (User.profile) doesn't carry realm_access —
// only the access token does, unless a custom "ID token" mapper is added.
// Decoding the access token's JWT payload is simpler than adding a realm
// protocol mapper in Task 1's Keycloak config, so roles are read from there.
function rolesOf(u: User): RoleName[] {
  try {
    const payload = u.access_token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      realm_access?: { roles?: string[] };
    };
    return decoded.realm_access?.roles ?? [];
  } catch {
    return [];
  }
}

function toAuthUser(u: User): AuthUser {
  return {
    id: u.profile.sub,
    username: (u.profile.preferred_username as string | undefined) ?? u.profile.sub,
    full_name: u.profile.name as string | undefined,
    email: u.profile.email as string | undefined,
    roles: rolesOf(u),
  };
}

const state = reactive<{ oidcUser: User | null }>({ oidcUser: null });

userManager.events.addUserLoaded((u) => { state.oidcUser = u; });
userManager.events.addUserUnloaded(() => { state.oidcUser = null; });
userManager.events.addSilentRenewError((err) => {
  console.error("[Auth] Silent renew failed:", err);
});

let restorePromise: Promise<void> | null = null;

async function doRestore(): Promise<void> {
  const u = await userManager.getUser();
  if (u && !u.expired) state.oidcUser = u;
}

export function useAuth() {
  function restoreSession(): Promise<void> {
    if (!restorePromise) restorePromise = doRestore();
    return restorePromise;
  }

  async function login(returnPath?: string) {
    await userManager.signinRedirect({
      state: { returnPath: returnPath ?? (window.location.hash.replace(/^#/, "") || "/") },
    });
  }

  async function logout() {
    await userManager.signoutRedirect();
  }

  function hasAnyRole(roles: RoleName[]) {
    const userRoles = state.oidcUser ? rolesOf(state.oidcUser) : [];
    return roles.some((r) => userRoles.includes(r));
  }

  return {
    get isLoggedIn() {
      return Boolean(state.oidcUser && !state.oidcUser.expired);
    },
    get user() {
      return state.oidcUser ? toAuthUser(state.oidcUser) : null;
    },
    get accessToken() {
      return state.oidcUser?.access_token ?? "";
    },
    restoreSession,
    login,
    logout,
    hasAnyRole,
  };
}

/** Called once from main.ts when the page loads with an OIDC `code`/`state` in the query string. */
export async function handleAuthCallback(): Promise<string> {
  const result = await userManager.signinRedirectCallback();
  const u = await userManager.getUser();
  if (u) state.oidcUser = u;
  const returnState = result.state as { returnPath?: string } | undefined;
  return returnState?.returnPath ?? "/";
}
