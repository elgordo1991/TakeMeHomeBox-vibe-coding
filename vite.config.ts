import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // ✅ Load .env variables based on current mode (e.g., development or production)
  const env = loadEnv(mode, process.cwd());

  // ✅ Optional: Debug log for sanity check
  console.log('[VITE CONFIG] Loaded API Key:', env.VITE_GOOGLE_MAPS_API_KEY);

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(env.VITE_GOOGLE_MAPS_API_KEY || ''),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID || ''),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            firebase: ['firebase/app', 'firebase/auth'],
          },
        },
      },
    },
  };
});
