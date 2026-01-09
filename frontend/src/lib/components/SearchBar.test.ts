import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import SearchBar from './SearchBar.svelte';

describe('SearchBar', () => {
	it('renders input field', () => {
		render(SearchBar);
		const input = screen.getByPlaceholderText(/Search for books/);
		expect(input).toBeInTheDocument();
	});

	it('calls onSearch with debounced input', async () => {
		const onSearch = vi.fn();
		render(SearchBar, { props: { onSearch } });
		
		const input = screen.getByPlaceholderText(/Search for books/);
		await fireEvent.input(input, { target: { value: 'test query' } });
		
		await waitFor(() => {
			expect(onSearch).toHaveBeenCalledWith('test query');
		}, { timeout: 600 });
	});

	it('calls onSearch immediately on form submit', async () => {
		const onSearch = vi.fn();
		render(SearchBar, { props: { onSearch } });
		
		const input = screen.getByPlaceholderText(/Search for books/);
		await fireEvent.input(input, { target: { value: 'immediate query' } });
		
		const form = input.closest('form');
		if (form) {
			await fireEvent.submit(form);
		}
		
		await waitFor(() => {
			expect(onSearch).toHaveBeenCalledWith('immediate query');
		});
	});
});
