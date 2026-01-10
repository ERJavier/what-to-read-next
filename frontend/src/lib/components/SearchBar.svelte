<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		value?: string;
		onSearch?: (query: string) => void;
		placeholder?: string;
	}

	let { value = $bindable(''), onSearch, placeholder = 'Search for books...' }: Props = $props();
	
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let searchInput: HTMLInputElement | null = $state(null);

	// Expose focus method
	export function focus() {
		searchInput?.focus();
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		
		debounceTimer = setTimeout(() => {
			if (value.trim()) {
				onSearch?.(value.trim());
			}
		}, 300);
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		if (value.trim()) {
			onSearch?.(value.trim());
		}
	}
</script>

<form onsubmit={handleSubmit} class="w-full max-w-2xl mx-auto">
	<div class="relative">
		<input
			bind:this={searchInput}
			type="text"
			class="input pr-12"
			placeholder={placeholder}
			value={value}
			oninput={handleInput}
		/>
		<button
			type="submit"
			class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary"
		>
			Search
		</button>
	</div>
</form>
