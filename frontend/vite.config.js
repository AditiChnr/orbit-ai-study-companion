import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/video_feed':   'http://localhost:5000',
      '/stats':        'http://localhost:5000',
      '/graph_data':   'http://localhost:5000',
      '/ask_ai':       'http://localhost:5000',
      '/extract_pdf':  'http://localhost:5000',
      '/att':          'http://localhost:5000',
      '/display':      'http://localhost:5000',
      '/set_pomodoro': 'http://localhost:5000',
      '/reminders':    'http://localhost:5000',
      '/sleep':        'http://localhost:5000',
    }
  },
  build: {
    outDir: '../backend/dist'
  }
})