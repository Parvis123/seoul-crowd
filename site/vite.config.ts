import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base is the repository name, because GitHub Pages serves the site from /seoul-crowd/
export default defineConfig({
  base: '/seoul-crowd/',
  plugins: [react(), tailwindcss()],
  // The map library's background worker is an ES module.
  worker: { format: 'es' },
  build: {
    // The Korean headline face comes as about a hundred small files, one per block of characters, so a
    // browser fetches only the few a page uses. Folding them into the stylesheet would make everyone download all of them.
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})
