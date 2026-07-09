import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router";
import { useAuth }  from "../services/auth";

// Routes are dynamically imported so each page ships only the code it actually
// uses. EditorPage in particular pulls in Monaco, GSAP, X6, and 60+ node
// components — none of that should load when a user is on /login or /diagrams.
const routes: RouteRecordRaw[] = [
  { path: "/login",       name: "Login",       component: () => import("../pages/LoginPage.vue"),    meta: { title: "Login", public: true } },
  { path: "/",            name: "DiagramList", component: () => import("../pages/DiagramList.vue"),  meta: { title: "Diagrams", public: true } },
  { path: "/editor/:id",  name: "Editor",      component: () => import("../pages/EditorPage.vue"),   meta: { title: "Editor", roles: ["operator", "admin", "super_admin"], requireAuth: true } },
  { path: "/viewer/:id",  name: "Viewer",      component: () => import("../pages/ViewerPage.vue"),   meta: { title: "Viewer", public: true } },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// ── Stale-deploy recovery ──────────────────────────────────────────────────
// Every route above is lazy-loaded via import(). When a new frontend build is
// deployed, the hashed chunk filenames change and the old ones are removed from
// dist (build.emptyOutDir). A browser tab that was opened BEFORE the deploy
// still references the old chunk names, so the next navigation (e.g. Editor →
// Viewer after a save) tries to import a chunk that now 404s. The dynamic
// import rejects, the route never renders, and the page looks "stuck / diagram
// disappeared and won't come back" — because every reload keeps requesting the
// same dead chunk until a fresh index.html is fetched.
//
// Fix: when a navigation fails due to a missing dynamic chunk, hard-reload once
// so the browser pulls the new index.html (and the new chunk names). A
// sessionStorage guard prevents an infinite reload loop if the chunk is truly
// gone for another reason.
const CHUNK_RELOAD_KEY = "spasdacs:chunk-reloaded";

function isDynamicImportError(error: unknown): boolean {
  const e = error as { message?: string; name?: string } | null;
  const msg = String(e?.message ?? error ?? "");
  return (
    e?.name === "ChunkLoadError" ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||      // Safari
    /'text\/html'.*not a valid JavaScript MIME type/i.test(msg) // server returned index.html for a missing chunk
  );
}

router.onError((error, to) => {
  if (!isDynamicImportError(error)) {
    console.error("[router] navigation error:", error);
    return;
  }
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    // Already reloaded once and still failing — don't loop. Surface the error.
    console.error("[router] chunk still missing after reload:", error);
    return;
  }
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  console.warn("[router] stale chunk after deploy — reloading to fetch fresh assets:", to?.fullPath);
  // Land on the intended route after the reload, then fetch a fresh document.
  if (to?.fullPath) window.location.hash = `#${to.fullPath}`;
  window.location.reload();
});

router.beforeEach((to) => {
  const auth = useAuth();
  auth.restoreSession();

  if (to.meta.public) {
    if (to.path === "/login" && auth.isLoggedIn) {
      return { path: "/" };
    }
    return true;
  }

  if (to.meta.requireAuth && !auth.isLoggedIn) {
    return {
      path: "/login",
      query: { redirect: to.fullPath },
    };
  }

  const requiredRoles = (to.meta.roles as string[] | undefined) ?? [];
  if (requiredRoles.length > 0 && !auth.hasAnyRole(requiredRoles)) {
    if (auth.isLoggedIn) {
      return { path: "/" };
    }
    return {
      path: "/login",
      query: { redirect: to.fullPath },
    };
  }

  return true;
});

router.afterEach((to) => {
  document.title = `SPASDACS — ${to.meta.title ?? ""}`;
  // Navigation succeeded → clear the stale-chunk reload guard so a future deploy
  // can trigger its own one-shot recovery reload.
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
});
