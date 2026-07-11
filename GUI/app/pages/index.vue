<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

definePageMeta({ layout: false, title: 'GEO RF Applications' })

const auth = useAuth()

interface AppTile {
  key: string
  name: string
  tagline: string
  description: string
  icon: string
  accent: string
  href: string
  external: boolean
}

const apps: AppTile[] = [
  {
    key: 'spasdacs',
    name: 'SPASDACS',
    tagline: 'Spacecraft Status Display & Commanding',
    description: 'Build live mimic diagrams and monitor real-time telemetry-driven displays.',
    icon: 'pi pi-sitemap',
    accent: 'violet',
    href: '/spasdacs/',
    external: true,
  },
  {
    key: 'tm',
    name: 'Telemetry',
    tagline: 'Live TM · UDTM · Limits',
    description: 'Monitor live telemetry streams, manage user-defined parameters and dynamic limits.',
    icon: 'pi pi-chart-line',
    accent: 'sky',
    href: '/tm',
    external: false,
  },
  {
    key: 'tc',
    name: 'TeleCommand',
    tagline: 'Upload · Database · Maps',
    description: 'Upload command sets, manage the telecommand database and data-command maps.',
    icon: 'pi pi-send',
    accent: 'emerald',
    href: '/tc',
    external: false,
  },
  {
    key: 'payloadTc',
    name: 'Payload TC',
    tagline: 'CFG · Data · Manual Commands',
    description: 'Configure payload commanding, manual and data-driven commands, and TC files.',
    icon: 'pi pi-box',
    accent: 'amber',
    href: '/payloadTc',
    external: false,
  },
]
</script>

<template>
  <div class="landing">
    <div class="landing-glow landing-glow--one" />
    <div class="landing-glow landing-glow--two" />

    <header class="landing-header">
      <div class="landing-brand">
        <img src="/tc.gif" alt="" class="landing-logo">
        <div class="landing-brand-text">
          <span class="landing-brand-title">GEO RF Applications</span>
          <span class="landing-brand-subtitle">Mission Control Portal</span>
        </div>
      </div>

      <div class="landing-user">
        <span v-if="auth.user.value" class="landing-username">
          <i class="pi pi-user" />
          {{ auth.user.value.profile.preferred_username }}
        </span>
        <button class="landing-logout" title="Log Out" @click="auth.logout()">
          <i class="pi pi-sign-out" />
        </button>
      </div>
    </header>

    <main class="landing-main">
      <div class="landing-hero">
        <h1>Welcome back<span v-if="auth.user.value">, {{ auth.user.value.profile.preferred_username }}</span></h1>
        <p>Select an application to get started.</p>
      </div>

      <div class="app-grid">
        <a
          v-for="app in apps"
          :key="app.key"
          :href="app.href"
          class="app-card"
          :class="`app-card--${app.accent}`"
        >
          <div class="app-card-icon">
            <i :class="app.icon" />
          </div>
          <div class="app-card-body">
            <h2>{{ app.name }}</h2>
            <span class="app-card-tagline">{{ app.tagline }}</span>
            <p>{{ app.description }}</p>
          </div>
          <div class="app-card-footer">
            <span>Open</span>
            <i class="pi pi-arrow-right" />
          </div>
        </a>
      </div>
    </main>

    <footer class="landing-footer">
      <span>GEO RF Applications &mdash; Telemetry &amp; Telecommand Ground Segment</span>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.landing {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at 15% 10%, #0f1a2e 0%, #0b1220 45%, #070b14 100%);
  overflow: hidden;
  font-family: Inter, sans-serif;
}

.landing-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.35;
  pointer-events: none;
  z-index: 0;
}

.landing-glow--one {
  width: 32rem;
  height: 32rem;
  top: -10rem;
  left: -8rem;
  background: #0ea5e9;
}

.landing-glow--two {
  width: 28rem;
  height: 28rem;
  bottom: -10rem;
  right: -6rem;
  background: #10b981;
  opacity: 0.25;
}

.landing-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  backdrop-filter: blur(6px);
}

.landing-brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.landing-logo {
  height: 2.75rem;
  width: auto;
  filter: drop-shadow(0 0 10px rgba(14, 165, 233, 0.45));
}

.landing-brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.landing-brand-title {
  color: #f1f5f9;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.landing-brand-subtitle {
  color: #64748b;
  font-size: 0.78rem;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.landing-user {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.landing-username {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #cbd5e1;
  font-size: 0.9rem;
}

.landing-logout {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  background: rgba(17, 24, 39, 0.7);
  color: #e2e8f0;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.landing-logout:hover {
  background: #1f2937;
  border-color: rgba(148, 163, 184, 0.6);
}

.landing-main {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1.5rem 2rem;
}

.landing-hero {
  text-align: center;
  margin-bottom: 2.75rem;

  h1 {
    margin: 0 0 0.5rem;
    font-size: 2.1rem;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: #94a3b8;
    font-size: 1rem;
  }
}

.app-grid {
  width: 100%;
  max-width: 1080px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1.5rem;
}

.app-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 1.75rem 1.5rem;
  border-radius: 16px;
  background: linear-gradient(160deg, rgba(17, 24, 39, 0.85) 0%, rgba(11, 18, 32, 0.9) 100%);
  border: 1px solid rgba(148, 163, 184, 0.15);
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(160deg, var(--accent-color) 0%, transparent 60%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover {
    transform: translateY(-4px);
    border-color: transparent;
    box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.55);

    &::before {
      opacity: 1;
    }

    .app-card-icon {
      background: var(--accent-color);
      color: #0b1220;
    }

    .app-card-footer {
      color: var(--accent-color);

      i {
        transform: translateX(3px);
      }
    }
  }
}

.app-card--violet { --accent-color: #a78bfa; }
.app-card--sky { --accent-color: #38bdf8; }
.app-card--emerald { --accent-color: #34d399; }
.app-card--amber { --accent-color: #fbbf24; }

.app-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--accent-color);
  font-size: 1.4rem;
  margin-bottom: 1.1rem;
  transition: background 0.2s ease, color 0.2s ease;
}

.app-card-body {
  flex: 1;

  h2 {
    margin: 0 0 0.15rem;
    font-size: 1.15rem;
    font-weight: 700;
    color: #f1f5f9;
  }

  p {
    margin: 0.65rem 0 0;
    font-size: 0.85rem;
    line-height: 1.5;
    color: #94a3b8;
  }
}

.app-card-tagline {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--accent-color);
  opacity: 0.85;
}

.app-card-footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  transition: color 0.2s ease;

  i {
    font-size: 0.75rem;
    transition: transform 0.2s ease;
  }
}

.landing-footer {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 1.25rem;
  color: #475569;
  font-size: 0.78rem;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

@media (max-width: 640px) {
  .landing-header {
    padding: 1rem 1.25rem;
  }

  .landing-brand-subtitle {
    display: none;
  }

  .landing-hero h1 {
    font-size: 1.6rem;
  }
}
</style>
