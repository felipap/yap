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
  root: path.resolve(srcDir, 'windows/library'),
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
      '~': path.resolve(srcDir, 'windows'),
    },
  },
  build: {
    sourcemap: true,
    outDir: path.resolve(rootDir, 'dist/windows/library'),
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
})
