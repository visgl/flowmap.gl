import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {input: {main: 'index.html', globe: 'globe.html'}},
  },
  server: {
    host: 'localhost',
  },
});
