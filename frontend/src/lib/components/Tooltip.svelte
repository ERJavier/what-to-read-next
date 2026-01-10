<script lang="ts">
	interface Props {
		text: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
		delay?: number;
	}

	let { text, position = 'top', delay = 300 }: Props = $props();

	let showTooltip = $state(false);
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let tooltipRef: HTMLDivElement | null = $state(null);

	function handleMouseEnter() {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => {
			showTooltip = true;
		}, delay);
	}

	function handleMouseLeave() {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		showTooltip = false;
	}

	$effect(() => {
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	});

	const positionClasses = {
		top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
		bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
		left: 'right-full top-1/2 -translate-y-1/2 mr-2',
		right: 'left-full top-1/2 -translate-y-1/2 ml-2'
	};

	const arrowClasses = {
		top: 'top-full left-1/2 -translate-x-1/2 border-t-academia-dark border-l-transparent border-r-transparent border-b-transparent',
		bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-academia-dark border-l-transparent border-r-transparent border-t-transparent',
		left: 'left-full top-1/2 -translate-y-1/2 border-l-academia-dark border-t-transparent border-b-transparent border-r-transparent',
		right: 'right-full top-1/2 -translate-y-1/2 border-r-academia-dark border-t-transparent border-b-transparent border-l-transparent'
	};
</script>

<div
	class="relative inline-block"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onfocusin={handleMouseEnter}
	onfocusout={handleMouseLeave}
	role="tooltip"
>
	<slot />
	{#if showTooltip}
		<div
			bind:this={tooltipRef}
			class="absolute z-50 px-3 py-2 text-sm text-academia-cream bg-academia-dark rounded-lg shadow-xl border border-academia-lighter whitespace-nowrap pointer-events-none {positionClasses[position]}"
			role="tooltip"
			aria-live="polite"
		>
			{text}
			<div
				class="absolute w-0 h-0 border-4 {arrowClasses[position]}"
				aria-hidden="true"
			></div>
		</div>
	{/if}
</div>
