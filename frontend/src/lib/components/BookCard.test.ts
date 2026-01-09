import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import BookCard from './BookCard.svelte';
import type { Book } from '../types';

const mockBook: Book = {
	id: 1,
	ol_key: '/works/OL123456W',
	title: 'Test Book',
	authors: ['Test Author'],
	first_publish_year: 2020,
	subjects: ['Fiction', 'Thriller'],
	similarity: 0.85
};

describe('BookCard', () => {
	it('renders book title', () => {
		render(BookCard, { props: { book: mockBook } });
		expect(screen.getByText('Test Book')).toBeInTheDocument();
	});

	it('renders author name', () => {
		render(BookCard, { props: { book: mockBook } });
		expect(screen.getByText(/Test Author/)).toBeInTheDocument();
	});

	it('renders publication year', () => {
		render(BookCard, { props: { book: mockBook } });
		expect(screen.getByText('2020')).toBeInTheDocument();
	});

	it('renders subjects', () => {
		render(BookCard, { props: { book: mockBook } });
		expect(screen.getByText('Fiction')).toBeInTheDocument();
		expect(screen.getByText('Thriller')).toBeInTheDocument();
	});

	it('renders similarity score when provided', () => {
		render(BookCard, { props: { book: mockBook } });
		expect(screen.getByText(/85%/)).toBeInTheDocument();
	});

	it('handles missing optional fields', () => {
		const minimalBook: Book = {
			id: 2,
			ol_key: '/works/OL789W',
			title: 'Minimal Book',
			authors: [],
			first_publish_year: null,
			subjects: []
		};
		render(BookCard, { props: { book: minimalBook } });
		expect(screen.getByText('Minimal Book')).toBeInTheDocument();
	});
});
