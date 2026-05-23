import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/vertin-chat/',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8765',
    },
  },
})
