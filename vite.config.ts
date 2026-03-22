import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/smogon': {
        target: 'https://www.smogon.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/smogon/, '')
      }
    }
  }
})
