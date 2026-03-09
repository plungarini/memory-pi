import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		port: 3002,
		strictPort: true,
		proxy: {
			'/api': 'http://localhost:3002',
			'/health': 'http://localhost:3002',
		},
	},
	build: {
		outDir: '../dist/public',
		emptyOutDir: true,
	},
});
