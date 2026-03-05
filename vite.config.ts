import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Use our custom SW file so push handlers are included
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw-custom.js',
      injectManifest: {
        injectionPoint: undefined,
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'NomosLink Legal Management',
        short_name: 'NomosLink',
        description: 'Advanced Legal Case and Staff Management System',
        theme_color: '#0B1F3A',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1000,
  },
});