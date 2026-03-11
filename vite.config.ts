import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0', // Bind to 0.0.0.0 to make it accessible over local network
      strictPort: false,
      cors: true,
      proxy: {
        '/api/auth': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/settings': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/jobs': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/admin/users': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/admin/credits': { target: 'http://localhost:3001', changeOrigin: true },
        '/api': { target: 'http://localhost:8000', changeOrigin: true }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  };
});
