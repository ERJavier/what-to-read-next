# WhatToRead Frontend

SvelteKit frontend for the WhatToRead book recommendation application.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create a `.env` file (optional, defaults to `http://localhost:8000`):
```bash
VITE_API_URL=http://localhost:8000
```

3. Start the development server:
```bash
pnpm dev
```

4. Build for production:
```bash
pnpm build
```

5. Preview production build:
```bash
pnpm preview
```

## Features

- **Semantic Search**: Search for books using natural language queries
- **Swipe Interface**: Tinder-style card stack for browsing books
- **Grid View**: Traditional grid layout for viewing multiple books
- **Taste Profile**: Track your search history and preferences
- **Dark Academia Theme**: Beautiful, book-inspired design

## Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable Svelte components
│   ├── api.ts         # API client functions
│   └── types.ts       # TypeScript type definitions
├── routes/
│   ├── +layout.svelte # Root layout
│   ├── +page.svelte   # Home page
│   └── +error.svelte  # Error page
└── hooks.server.ts    # Server-side hooks for API proxying
```

## API Integration

The frontend communicates with the FastAPI backend running on `http://localhost:8000` by default. You can configure this via the `VITE_API_URL` environment variable.

The application uses client-side API calls, but also includes server-side hooks for proxying requests if needed.
