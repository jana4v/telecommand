import { createApp } from "vue";
import { router } from "./router/index";
import App from "./App.vue";
import "./assets/fonts.css";
import { handleAuthCallback } from "./services/auth";
import "./services/apiAuth";

async function bootstrap() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("code") && params.has("state")) {
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
