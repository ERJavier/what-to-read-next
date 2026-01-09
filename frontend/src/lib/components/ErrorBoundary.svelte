<script lang="ts">
	interface Props {
		error?: Error;
	}

	let { error }: Props = $props();
</script>

{#if error}
	<div class="card bg-red-900/20 border-red-500">
		<h2 class="text-xl font-bold text-red-400 mb-2">Error</h2>
		<p class="text-red-300">{error.message}</p>
	</div>
{/if}
