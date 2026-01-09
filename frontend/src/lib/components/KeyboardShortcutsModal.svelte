<script lang="ts">
	interface Props {
		open: boolean;
		onClose: () => void;
	}

	let { open, onClose }: Props = $props();

	function handleEscape(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleBackdropKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' || e.key === 'Enter') {
			onClose();
		}
	}

	// Handle escape key
	$effect(() => {
		if (!open || typeof window === 'undefined') return;

		window.addEventListener('keydown', handleEscape);
		document.body.style.overflow = 'hidden';

		return () => {
			window.removeEventListener('keydown', handleEscape);
			document.body.style.overflow = '';
		};
	});
</script>

{#if open}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
		onclick={handleBackdropClick}
		onkeydown={handleBackdropKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="shortcuts-title"
		tabindex="0"
	>
		<!-- Modal Content -->
		<div
			class="bg-academia-light rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-academia-lighter"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<!-- Header -->
			<div class="sticky top-0 bg-academia-light z-10 flex justify-between items-center p-6 border-b border-academia-lighter">
				<h2
					id="shortcuts-title"
					class="text-2xl font-serif font-bold text-academia-gold"
				>
					Keyboard Shortcuts
				</h2>
				<button
					onclick={onClose}
					class="text-academia-cream/60 hover:text-academia-cream transition-colors"
					aria-label="Close modal"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-6">
				<!-- Navigation -->
				<div>
					<h3 class="text-lg font-semibold text-academia-cream mb-3">Navigation</h3>
					<div class="space-y-2">
						<div class="flex justify-between items-center py-2 border-b border-academia-lighter">
							<span class="text-academia-cream">Focus search bar</span>
							<kbd class="px-3 py-1 bg-academia-dark border border-academia-lighter rounded text-sm text-academia-gold font-mono">
								/
							</kbd>
						</div>
						<div class="flex justify-between items-center py-2 border-b border-academia-lighter">
							<span class="text-academia-cream">Close modals</span>
							<kbd class="px-3 py-1 bg-academia-dark border border-academia-lighter rounded text-sm text-academia-gold font-mono">
								Esc
							</kbd>
						</div>
						<div class="flex justify-between items-center py-2 border-b border-academia-lighter">
							<span class="text-academia-cream">Show this help</span>
							<kbd class="px-3 py-1 bg-academia-dark border border-academia-lighter rounded text-sm text-academia-gold font-mono">
								?
							</kbd>
						</div>
					</div>
				</div>

				<!-- Swiping (Swipe Mode) -->
				<div>
					<h3 class="text-lg font-semibold text-academia-cream mb-3">Swipe Mode</h3>
					<div class="space-y-2">
						<div class="flex justify-between items-center py-2 border-b border-academia-lighter">
							<span class="text-academia-cream">Swipe right (interested)</span>
							<div class="flex gap-1">
								<kbd class="px-3 py-1 bg-academia-dark border border-academia-lighter rounded text-sm text-academia-gold font-mono">
									→
								</kbd>
								<span class="text-academia-cream/60 text-sm">or</span>
								<kbd class="px-3 py-1 bg-academia-dark border border-academia-lighter rounded text-sm text-academia-gold font-mono">
									Right Arrow
								</kbd>
							</div>
						</div>
						<div class="flex justify-between items-center py-2 border-b border-academia-lighter">
							<span class="text-academia-cream">Swipe left (not interested)</span>
							<div class="flex gap-1">
								<kbd class="px-3 py-1 bg-academia-dark border border-academia-lighter rounded text-sm text-academia-gold font-mono">
									←
								</kbd>
								<span class="text-academia-cream/60 text-sm">or</span>
								<kbd class="px-3 py-1 bg-academia-dark border border-academia-lighter rounded text-sm text-academia-gold font-mono">
									Left Arrow
								</kbd>
							</div>
						</div>
					</div>
					<p class="text-sm text-academia-cream/60 mt-3">
						Note: Arrow keys only work in Swipe mode when books are available.
					</p>
				</div>

				<!-- Tips -->
				<div class="bg-academia-dark/50 rounded-lg p-4 border border-academia-lighter">
					<h3 class="text-sm font-semibold text-academia-gold mb-2">Tips</h3>
					<ul class="text-sm text-academia-cream/80 space-y-1 list-disc list-inside">
						<li>Shortcuts are disabled when typing in input fields</li>
						<li>Use <kbd class="px-1.5 py-0.5 bg-academia-dark border border-academia-lighter rounded text-xs">Tab</kbd> to navigate between interactive elements</li>
						<li>Press <kbd class="px-1.5 py-0.5 bg-academia-dark border border-academia-lighter rounded text-xs">Enter</kbd> to activate buttons and links</li>
					</ul>
				</div>
			</div>

			<!-- Footer -->
			<div class="sticky bottom-0 bg-academia-light border-t border-academia-lighter p-4 flex justify-end">
				<button onclick={onClose} class="btn btn-primary">
					Got it
				</button>
			</div>
		</div>
	</div>
{/if}
