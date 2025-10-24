import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // react({
    //   fastRefresh: true,
    // }),
  ],
  root: 'windows/camera',
  base: './',
  server: {
    port: 4002,
    hmr: {
      port: 4002,
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
    outDir: '../../dist/windows/camera',
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
})
