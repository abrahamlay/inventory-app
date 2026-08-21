import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path bisa diatur via env VITE_BASE_PATH (default: '/')
// Contoh untuk sub-path: VITE_BASE_PATH=/inventory-app/ npm run build
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})