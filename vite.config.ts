import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    restoreMocks: true,
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer'],
    exclude: ['svelte']
  },
  resolve: {
    alias: {
      buffer: 'buffer'
    }
  },
  ssr: {
    noExternal: ['@ton/core', '@ton/crypto', '@ton/ton', '@tonconnect/ui']
  },
  build: {
    // Production optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging
        drop_debugger: true,
        dead_code: true
      },
      mangle: {
        toplevel: false // Disable top-level mangling to prevent issues
      }
    },
    rollupOptions: {
      output: {
        // Split chunks for better caching - only for non-external modules
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('matter-js')) return 'vendor-matter';
            if (id.includes('chart.js')) return 'vendor-chart';
            if (id.includes('uuid') || id.includes('tailwind-merge')) return 'vendor-utils';
            return 'vendor';
          }
        }
      }
    },
    // Performance settings
    chunkSizeWarningLimit: 1000,
    sourcemap: true, // Enable sourcemaps for debugging
    reportCompressedSize: false // Speed up build process
  },
  // Development optimizations
  server: {
    fs: {
      allow: ['..']
    }
  }
});
