import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    // react({
    //   fastRefresh: true,
    // }),
    react(),
  ],
  root: 'src/windows/library',
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
    include: ['react', 'react-dom'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '~': path.resolve(__dirname, 'src/windows'),
    },
  },
  build: {
    sourcemap: true,
    outDir: '../../../dist/windows/library',
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
})
