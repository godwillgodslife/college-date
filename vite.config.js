import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
      port: 5173,
    }
  },
  resolve: {
    extensions: ['.mjs', '.js', '.jsx', '.json', '.wasm']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('agora-rtc-sdk-ng')) {
              return 'agora';
            }
            if (id.includes('framer-motion') || id.includes('motion')) {
              return 'framer-motion';
            }
            if (id.includes('@supabase/')) {
              return 'supabase';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 800
  }
})
