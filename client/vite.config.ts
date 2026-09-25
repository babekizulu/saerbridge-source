import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { sourcePwa } from './pwa-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sourcePwa(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3011',
        // Leave room for the browser to report its own ten-minute deadline.
        timeout: 660000,
        proxyTimeout: 660000,
        configure(proxy) {
          // Vite has already sent headers for streamed progress. Terminate an
          // interrupted body so fetch rejects instead of waiting ten minutes.
          proxy.on('proxyRes', (upstream, _request, response) => {
            upstream.on('aborted', () => response.destroy())
            upstream.on('error', () => response.destroy())
          })
          proxy.on('error', (_error, _request, response) => {
            if ('headersSent' in response && response.headersSent) response.destroy()
          })
        },
      },
    },
  },
})
