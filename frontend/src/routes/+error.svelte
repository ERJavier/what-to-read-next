<script lang="ts">
	import { page } from '$app/stores';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';

	interface Props {
		error?: Error;
		status?: number;
		message?: string;
	}

	let { error, status, message }: Props = $props();
</script>

<svelte:head>
	<title>Error - WhatToRead</title>
</svelte:head>

<div class="min-h-screen p-8 flex items-center justify-center">
	<div class="card max-w-2xl w-full">
		<h1 class="text-3xl font-serif font-bold text-academia-gold mb-4">
			{status || 'Error'}
		</h1>
		<ErrorBoundary error={error} />
		{#if message}
			<p class="text-academia-cream/80 mt-4">{message}</p>
		{/if}
		<a href="/" class="btn btn-primary mt-6 inline-block">Go Home</a>
	</div>
</div>
