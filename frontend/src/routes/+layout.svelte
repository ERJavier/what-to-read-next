<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>WhatToRead - Discover Your Next Book</title>
</svelte:head>

<div class="min-h-screen">
	{@render children()}
</div>
