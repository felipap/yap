import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // react({
    //   fastRefresh: true,
    // }),
    react(),
  ],
  root: 'windows/main',
  base: './',
  server: {
    port: 4000,
    hmr: {
      port: 4000,
      host: 'localhost',
    },
    cors: true,
    strictPort: true,
  },
  optimizeDeps: {
    // include: ['react', 'react-dom'],
  },
  build: {
    sourcemap: true,
    outDir: '../../dist/windows/main',
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
})
