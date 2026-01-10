import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		// Optimize build output
		target: 'esnext',
		minify: 'esbuild', // Use esbuild for faster builds
		sourcemap: false, // Disable sourcemaps in production for smaller bundle
		rollupOptions: {
			output: {
				// Manual chunk splitting for better caching
				manualChunks: (id) => {
					// Vendor chunks
					if (id.includes('node_modules')) {
						// Separate Svelte and SvelteKit into their own chunk
						if (id.includes('svelte') || id.includes('@sveltejs')) {
							return 'svelte-vendor';
						}
						// Other vendor libraries
						return 'vendor';
					}
				},
				// Optimize chunk file names for better caching
				chunkFileNames: 'chunks/[name]-[hash].js',
				entryFileNames: 'entries/[name]-[hash].js',
				assetFileNames: 'assets/[name]-[hash].[ext]'
			}
		},
		// Increase chunk size warning limit (since we're splitting manually)
		chunkSizeWarningLimit: 1000
	},
	// Optimize dependencies pre-bundling
	optimizeDeps: {
		include: ['svelte'],
		exclude: []
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.ts'],
		globals: true
	}
});
