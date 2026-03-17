import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const rootDir = path.resolve(__dirname, '..')
const srcDir = __dirname

export default defineConfig({
  plugins: [
    // react({
    //   fastRefresh: true,
    // }),
    react(),
  ],
  root: path.resolve(srcDir, 'windows/settings'),
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
    include: ['react', 'react-dom'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '~': path.resolve(srcDir, 'windows'),
    },
  },
  build: {
    sourcemap: true,
    outDir: path.resolve(rootDir, 'dist/windows/settings'),
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
})
