import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served by FastAPI under /dashboard (see app/frontend.py).
export default defineConfig({
  base: '/dashboard/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
