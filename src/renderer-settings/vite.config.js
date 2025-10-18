import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  build: {
    outDir: '../../dist/renderer-settings',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 3001,
    hmr: {
      port: 3001,
      host: 'localhost',
    },
    cors: true,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
