import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		// Optimize build output
		target: 'esnext',
		minify: 'esbuild', // Use esbuild for faster builds
		sourcemap: false, // Disable sourcemaps in production for smaller bundle
		cssCodeSplit: true, // Split CSS per component for better caching
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
						// Separate large dependencies
						if (id.includes('svelte-motion')) {
							return 'motion-vendor';
						}
						// Other vendor libraries
						return 'vendor';
					}
					// Split heavy components into separate chunks
					if (id.includes('/lib/components/EnhancedTasteProfile')) {
						return 'enhanced-taste-profile';
					}
					if (id.includes('/lib/components/BookDetailModal')) {
						return 'book-detail-modal';
					}
					if (id.includes('/lib/components/SwipeStack')) {
						return 'swipe-stack';
					}
				},
				// Optimize chunk file names for better caching
				chunkFileNames: 'chunks/[name]-[hash].js',
				entryFileNames: 'entries/[name]-[hash].js',
				assetFileNames: 'assets/[name]-[hash].[ext]',
				// Tree shaking optimization
				preserveEntrySignatures: 'strict'
			},
			// Enable tree shaking
			treeshake: {
				moduleSideEffects: 'no-external',
				preset: 'recommended',
				propertyReadSideEffects: false,
				tryCatchDeoptimization: false
			}
		},
		// Increase chunk size warning limit (since we're splitting manually)
		chunkSizeWarningLimit: 1000
	},
	// Optimize dependencies pre-bundling
	optimizeDeps: {
		include: ['svelte'],
		exclude: [],
		// Enable esbuild optimizations
		esbuildOptions: {
			treeShaking: true
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.ts'],
		globals: true
	}
});
