import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // ── Dev server proxy ───────────────────────────────────────────────────────
  // All /api/* requests from the frontend will be forwarded to the
  // Node.js backend during development. This avoids CORS issues and means
  // you don't need VITE_API_URL set while running locally.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
