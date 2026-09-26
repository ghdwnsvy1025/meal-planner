import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 처럼 하위 경로에 올릴 때는 BASE_PATH=/repo-name/ 로 빌드
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '식단표',
        short_name: '식단표',
        description: '자주 먹는 조합으로 하루 식단을 고르고, 영양 통계를 보는 개인용 식단표',
        lang: 'ko',
        display: 'standalone',
        start_url: '.',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 음식 DB(약 1.6MB)는 설치 시 미리 받고, 가공식품 DB(약 35MB)는 처음 검색할 때 받아 캐시한다
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}', 'food-db-dish.json'],
        globIgnores: ['**/food-db-processed.json'],
        runtimeCaching: [
          {
            urlPattern: /\/food-db-processed\.json$/,
            handler: 'CacheFirst',
            options: { cacheName: 'food-db-processed', expiration: { maxEntries: 1 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
