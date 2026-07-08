import Aura from '@primeuix/themes/aura';
import MyPreset from "./CustomThemes";
import pkg from './package.json' with { type: 'json' };

// In dev mode the Nuxt dev-server runs on port 3000. Relative API paths resolve
// against that origin (e.g. http://127.0.0.1:3000/api/go/v1/...). Use absolute
// URLs so calls go straight to nginx on port 80 and the :3000 port never appears.
// These are the CONFIG DEFAULTS — a local .env file (gitignored) can override them.
// Use command-based detection so production builds don't accidentally inherit
// development API defaults from shell NODE_ENV overrides.
const isDev = process.argv.some(arg => /(^|:)dev($|:)/.test(arg));
const devHost = 'http://127.0.0.1:21000';

export default defineNuxtConfig({
  // Nuxt 4 compatibility
  future: {
    compatibilityVersion: 4,
  },
  
  // Directory configuration for Nuxt 4
  srcDir: 'app/',
  
  css: [
    '@fortawesome/fontawesome-free/css/all.css',
    'handsontable/styles/handsontable.css',
    'handsontable/styles/ht-theme-main.css',
    'handsontable/styles/ht-icons-main.css',
  ],

  compatibilityDate: '2024-07-04',

  ssr: false,
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      APP_VERSION: pkg.version,
      APP_NAME: pkg.name,
      // eslint-disable-next-line node/prefer-global/process
      APP_MODE: process.env?.NODE_ENV,
      // API base paths.
      // Dev default → absolute URL (no :3000 port in requests).
      // Prod default → relative path (nginx proxies at the same origin).
      // Override via .env (NUXT_PUBLIC_API_BASE, etc.) for non-standard setups.
      apiBase:          isDev ? `${devHost}/api/go/v1`          : '/api/go/v1',
      tmApiBase:        isDev ? `${devHost}/api/v2/tm`          : '/api/v2/tm',
      restApiBase:      isDev ? `${devHost}/restApi`            : '/restApi',
      simulatorApiBase: isDev ? `${devHost}/simulator/api/go/v1`: '/simulator/api/go/v1',
      // Keycloak is a separate origin reached directly by the browser (not
      // proxied) — the OIDC redirect flow works cross-origin by design.
      // Override via NUXT_PUBLIC_KEYCLOAK_URL/_REALM/_CLIENT_ID in .env.
      keycloakUrl:      'http://localhost:8080',
      keycloakRealm:    'mainframe',
      keycloakClientId: 'tm-tc-spa',
    },
  },

  // Performance optimizations
  vite: {
    server: {
      fs: {
        allow: [
          'D:/code/Code/Mainframe/MainframeAutomation/Telecommand/GUI',
          'D:/code/Code/Mainframe/MainframeAutomation/GUI',
        ],
      },
      // In dev mode, proxy API calls to the running Go backend services so
      // large file uploads (and WebSocket connections) work correctly.
      // http-proxy is used under the hood — far more reliable than Nitro's
      // devProxy (which buffers bodies via the Fetch API and breaks on large
      // multipart uploads).
      proxy: {
        '/api/go/v1': { target: 'http://localhost:21000', changeOrigin: false },
        '/api/v2/tm': { target: 'http://127.0.0.1:8010', changeOrigin: false },
        '/nats': { target: 'ws://localhost:4223', ws: true, changeOrigin: false },
      },
    },
    optimizeDeps: {
      exclude: ['monaco-editor'],
    },
    plugins: [
      {
        // monaco-editor's marked.js has a sourceMappingURL pointing to a file
        // that is not shipped in the npm package. Vite reads the reference at
        // load time, so strip the comment in a pre-load hook to avoid the WARN.
        name: 'monaco-sourcemap-fix',
        enforce: 'pre' as const,
        async load(id: string) {
          if (id.includes('monaco-editor') && id.replace(/\\/g, '/').includes('/marked/marked.js')) {
            const { readFile } = await import('node:fs/promises')
            const code = await readFile(id.split('?')[0], 'utf-8')
            return {
              code: code.replace(/\/\/# sourceMappingURL=\S+\.map\b/g, ''),
              map: null,
            }
          }
        },
      },
    ],
    build: {
      rollupOptions: {
        // @univerjs packages declare react/react-dom as peer deps but this app
        // doesn't use React — mark them external so Rollup doesn't try to bundle them.
        // Catch react, react-dom, react-dom/client, react/jsx-runtime, etc.
        external: (id) => id === 'react' || id.startsWith('react-dom') || id.startsWith('react/'),
        output: {
          manualChunks: {
            vendor: ['vue', 'pinia'],
            primevue: ['primevue'],
            charts: ['ag-charts-vue3', 'ag-grid-vue3'],
            utils: ['lodash', 'uuid'],
          },
        },
      },
    },
  },

  modules: [
    '@pinia/nuxt',
    '@nuxt/content',
    '@vueuse/nuxt',
    '@nuxt/image',
    '@nuxt/fonts',
    '@primevue/nuxt-module',
    '@unocss/nuxt',
    ['@vite-pwa/nuxt', {
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mainframe GUI',
        short_name: 'GUI',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: [], // no precaching — installability only
      },
    }],
  ],

  i18n: {
    langDir: 'locales',
    defaultLocale: 'en',
    strategy: 'no_prefix',
    locales: [
      { code: 'en', file: 'en.json', name: 'English' },
    ],
    vueI18n: './vue-i18n.options.ts',
  },

  content: {
    highlight: {
      theme: {
        // Default theme (same as single string)
        default: 'github-light',
        // Theme used if `html.dark`
        dark: 'github-dark',
      }
    }
  },
  
  primevue: {
    autoImport: true,
    options: {
      theme: {
        preset: MyPreset,
        options: {
          darkModeSelector: '.dark',
        },
      },
      ripple: true,
    },
    importPT: { as: 'Aura', from: '@primeuix/themes/aura' },
    components: {
      prefix: '',
    },
  },

  build: {
    transpile: ['nuxt', 'primevue'],
    
  },

  sourcemap: {
    client: 'hidden', // Better for debugging while still being production-friendly
    server: false,
  },
  app: {
    baseURL: '/',
  },

  nitro: {
    output: {
      // Static files land in GoLang New/webserver/dist/web/gui after `nuxt generate`.
      publicDir: '../ui/dist/tm_tc',
    },
    prerender: {
      crawlLinks: false,
      routes: ['/sitemap.xml'],
    },
  },
  
  
});