import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../docs/admin',
    emptyOutDir: false,
  },
  server: {
    port: 3001,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
