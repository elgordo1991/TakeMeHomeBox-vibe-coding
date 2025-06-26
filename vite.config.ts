import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import htmlEnv from 'vite-plugin-html-env';

export default defineConfig({
  plugins: [react(), htmlEnv()],
});
