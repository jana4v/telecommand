import { createApp } from "vue";
import { router } from "./router/index";
import App from "./App.vue";
import "./assets/fonts.css";
import { handleAuthCallback, userManager } from "./services/auth";
import "./services/apiAuth";

async function bootstrap() {
  const params = new URLSearchParams(window.location.search);
  const isCallback = params.has("code") && params.has("state");

  if (isCallback && window.self !== window.top) {
    // Hidden silent-renewal iframe (automaticSilentRenew falls back to
    // redirect_uri since no silent_redirect_uri is set) — this loads the
    // same index.html, but must complete the silent refresh, not the
    // interactive callback, and must not mount the Vue app.
    try {
      await userManager.signinSilentCallback();
    } catch (err) {
      console.error("[Auth] Silent renew callback failed:", err);
    }
    return;
  }

  if (isCallback) {
    try {
      const returnPath = await handleAuthCallback();
      window.history.replaceState({}, "", window.location.pathname);
      router.push(returnPath);
    } catch (err) {
      console.error("[Auth] Callback handling failed:", err);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }
  createApp(App).use(router).mount("#app");
}

bootstrap();
