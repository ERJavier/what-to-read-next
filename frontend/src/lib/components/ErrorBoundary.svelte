<script lang="ts">
	import { getErrorSuggestions } from '../errorUtils';

	interface Props {
		error?: Error;
		showSuggestions?: boolean;
		onAction?: (action: string) => void;
	}

	let { error, showSuggestions = true, onAction }: Props = $props();

	const errorInfo = $derived(error ? getErrorSuggestions(error) : null);
</script>

{#if error}
	<div class="card bg-red-900/20 border-red-500" role="alert" aria-live="assertive">
		<h2 class="text-xl font-bold text-red-400 mb-2">
			{errorInfo?.title || 'Error'}
		</h2>
		<p class="text-red-300 mb-4">{error.message}</p>
		
		{#if showSuggestions && errorInfo && errorInfo.suggestions.length > 0}
			<div class="mt-4 pt-4 border-t border-red-500/30">
				<h3 class="text-lg font-semibold text-red-400 mb-3">What you can do:</h3>
				<ul class="space-y-2 list-disc list-inside text-red-200/90">
					{#each errorInfo.suggestions as suggestion}
						<li>{suggestion}</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/if}
