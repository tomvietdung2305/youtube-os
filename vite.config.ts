import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Shim process.env so existing code using process.env.API_KEY works
      'process.env': env
    },
    build: {
      outDir: 'dist',
    }
  }
})