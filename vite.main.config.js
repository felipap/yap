import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
    }),
  ],
  root: 'windows/main',
  base: './',
  build: {
    outDir: '../../dist/windows/main',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 4000,
    hmr: {
      port: 4000,
      host: 'localhost',
    },
    cors: true,
    strictPort: true,
  },
  // optimizeDeps: {
  //   include: ['react', 'react-dom'],
  // },
})
