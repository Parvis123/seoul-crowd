import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base is the repository name, because GitHub Pages serves the site from /seoul-crowd/
export default defineConfig({
  base: '/seoul-crowd/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})
