import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      // Only the app shell (JS/CSS/HTML/fonts) is precached — deliberately no
      // runtimeCaching for Supabase requests, so debt/bill/goal data is never
      // served stale from a cache. Offline just means the shell loads and
      // data fetches fail normally, same as any other network drop.
      manifest: {
        name: 'Oaksteadly',
        short_name: 'Oaksteadly',
        description: 'Track debt payoff, monthly bills, and personal goals in one dashboard, synced across every device.',
        theme_color: '#020817',
        background_color: '#020817',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
