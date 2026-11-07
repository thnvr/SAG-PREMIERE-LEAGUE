import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Expose VITE_, NEXT_PUBLIC_, SUPABASE_, and FIREBASE_ prefixed environment variables
  envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'SUPABASE_', 'FIREBASE_'],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
