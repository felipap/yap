import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // react({
    //   fastRefresh: true,
    // }),
    react(),
  ],
  root: 'windows/settings',
  base: './',
  server: {
    port: 4001,
    hmr: {
      port: 4001,
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
    outDir: '../../dist/windows/settings',
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
})
