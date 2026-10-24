import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      // Docker's dev CORS allowlist uses localhost:3000, including when the
      // browser reaches Vite through 127.0.0.1. Authentication still runs in Spring.
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true, headers: { origin: 'http://localhost:3000' } },
      '/ws': { target: 'http://127.0.0.1:8080', changeOrigin: true, ws: true, headers: { origin: 'http://localhost:3000' } },
    },
  },
  plugins: [react()],
  define: {
    global: 'window',
  },
})
