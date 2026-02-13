import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Generate source maps for debugging (optional - can disable for smaller builds)
    sourcemap: false,
    // Output directory (default is 'dist')
    outDir: 'dist',
    // Ensure assets are properly referenced
    assetsDir: 'assets',
    // Optimize chunking for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
        },
      },
    },
    // Minification settings
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Increase warning limit since we have large data files
    chunkSizeWarningLimit: 600,
  },
  // Base URL - use '/' for root deployment
  base: '/',
})
