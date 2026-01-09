<script lang="ts">
	interface Props {
		message?: string;
	}

	let { message = 'Loading...' }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-12">
	<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-academia-gold mb-4"></div>
	<p class="text-academia-cream/80">{message}</p>
</div>
