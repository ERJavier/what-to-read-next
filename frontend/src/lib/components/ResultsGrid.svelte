<script lang="ts">
	import type { Book } from '../types';
	import BookCard from './BookCard.svelte';

	interface Props {
		books: Book[];
		onBookClick?: (book: Book) => void;
	}

	let { books, onBookClick }: Props = $props();
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
	{#each books as book (book.id)}
		<BookCard
			{book}
			onClick={() => onBookClick?.(book)}
		/>
	{/each}
</div>

{#if books.length === 0}
	<div class="text-center py-12">
		<p class="text-academia-cream/60 text-lg">No books found. Try a different search.</p>
	</div>
{/if}
