<script lang="ts">
	interface Props {
		queries: string[];
	}

	let { queries }: Props = $props();
</script>

{#if queries.length > 0}
	<div class="card">
		<h3 class="text-lg font-serif font-bold text-academia-gold mb-4">Your Taste Profile</h3>
		<div class="space-y-2">
			{#each queries as query}
				<div class="flex items-center gap-2">
					<div class="w-2 h-2 bg-academia-gold rounded-full"></div>
					<p class="text-sm text-academia-cream/80">{query}</p>
				</div>
			{/each}
		</div>
		<p class="text-xs text-academia-accent mt-4">
			Based on {queries.length} search{queries.length !== 1 ? 'es' : ''}
		</p>
	</div>
{/if}
