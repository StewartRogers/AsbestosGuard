import path from 'path';
import dotenv from 'dotenv';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load local .env into process.env
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Proxy all /__api requests to the Express server (port 5000)
        proxy: {
          '/__api': {
            target: 'http://localhost:5000',
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Enable top-level await and modern syntax support in the output bundle
        // to match the app's usage and avoid esbuild target downgrades.
        target: 'es2022'
      }
    };
});
