import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite = the tool that runs the React app while you develop.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true, // opens your browser automatically when the server starts
    proxy: {
      // Any request the app makes to "/api/..." is forwarded to the FastAPI
      // server. This means the frontend code can just call fetch('/api/tasks')
      // and we never have to worry about CORS during development.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
