import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // 开发服务器端口
    proxy: {
      // 配置后端 API 代理,解决跨域问题
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});