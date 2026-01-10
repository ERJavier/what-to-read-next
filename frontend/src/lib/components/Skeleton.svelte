<script lang="ts">
	interface Props {
		width?: string;
		height?: string;
		variant?: 'text' | 'circular' | 'rectangular' | 'card';
		lines?: number; // For text variant
		class?: string;
	}

	let { 
		width = '100%', 
		height = '1rem',
		variant = 'rectangular',
		lines = 1,
		class: className = ''
	}: Props = $props();

	const variantClasses = {
		text: 'rounded',
		circular: 'rounded-full',
		rectangular: 'rounded-md',
		card: 'rounded-lg'
	};
</script>

{#if variant === 'text' && lines > 1}
	<div class="flex flex-col gap-2 {className}">
		{#each Array(lines) as _, i}
			<div
				class="animate-pulse bg-academia-lighter {variantClasses[variant]} {i === lines - 1 ? 'w-3/4' : 'w-full'}"
				style="height: {height}; width: {i === lines - 1 ? '75%' : '100%'};"
				aria-hidden="true"
			></div>
		{/each}
	</div>
{:else}
	<div
		class="animate-pulse bg-academia-lighter {variantClasses[variant]} {className}"
		style="width: {width}; height: {height};"
		aria-hidden="true"
	></div>
{/if}
