# Issues Ready to Create

This document contains well-defined issues ready to be posted to GitHub. Each issue is formatted and can be copy-pasted directly into GitHub Issues.

---

## Issue 1: Add Hover Effects on Book Cards in Grid View

**Labels**: `good first issue`, `enhancement`, `ui/ux`

**Template**: Use "Feature Request" template

### Description
The `BookCard` component in grid view (`ResultsGrid`) currently lacks hover effects, making the interface feel less interactive. Adding hover effects will improve user experience and provide better visual feedback.

### Expected Behavior
When hovering over a book card in grid view:
- Card should have a subtle lift/shadow effect (using CSS transforms)
- Optional: slight scale increase (1.02-1.05x)
- Transition should be smooth (200-300ms)
- Maintain accessibility (hover effects shouldn't break keyboard navigation)

### Technical Details
- **File to modify**: `frontend/src/lib/components/BookCard.svelte`
- **Consider**: Using Tailwind's hover utilities (`hover:shadow-lg`, `hover:scale-105`, `transition-all`)
- **Check**: Ensure hover effects work in both dark and light themes
- **Component**: Already has `ResultsGrid.svelte` that uses `BookCard`

### Acceptance Criteria
- [ ] Hover effects work on desktop (mouse)
- [ ] Hover effects don't interfere with touch interactions
- [ ] Effects are smooth and performant (no jank)
- [ ] Works in both light and dark themes
- [ ] Keyboard navigation still works properly

---

## Issue 2: Enhance Alt Text for Book Cover Images

**Labels**: `good first issue`, `accessibility`, `documentation`

**Template**: Use "Feature Request" template

### Description
Currently, book cover images use basic alt text like `"Cover for ${book.title}"`. We should enhance this to be more descriptive and informative for screen reader users, following WCAG 2.1 guidelines.

### Current Implementation
In `BookCard.svelte` (line 104):
```svelte
alt={`Cover for ${book.title}`}
```

### Proposed Enhancement
Alt text should include:
- Book title
- Author name(s)
- Publication year (if available)
- Format: "Book cover for [Title] by [Author], published [Year]"

### Technical Details
- **Files to modify**:
  - `frontend/src/lib/components/BookCard.svelte`
  - `frontend/src/lib/components/BookDetailModal.svelte` (check for other image instances)
  - Any other components displaying book covers
- **Consider**: Creating a helper function `getBookCoverAltText(book: Book): string` in `imageUtils.ts`

### Acceptance Criteria
- [ ] Alt text includes title, author, and year
- [ ] Alt text is concise but descriptive (< 125 characters recommended)
- [ ] Helper function created for reusability
- [ ] All book cover images use enhanced alt text
- [ ] Tested with screen reader (VoiceOver/NVDA)

---

## Issue 3: Add Fade-in Animations for Search Results

**Labels**: `good first issue`, `enhancement`, `animation`

**Template**: Use "Feature Request" template

### Description
When search results appear, they should fade in smoothly rather than appearing instantly. This provides better visual feedback and a more polished user experience.

### Expected Behavior
- When new search results load, each book card should fade in
- Optional: Staggered animation (cards appear one after another with small delays)
- Animation should be subtle and quick (200-400ms)
- Respect `prefers-reduced-motion` for accessibility

### Technical Details
- **Files to modify**:
  - `frontend/src/lib/components/ResultsGrid.svelte`
  - Possibly create a fade-in animation utility
- **Animation approach**: 
  - Option 1: CSS animations with Tailwind (`animate-fade-in`)
  - Option 2: Svelte transitions (`fade`, `fly`)
  - Option 3: Framer Motion (if already in dependencies)
- **Stagger**: Use index-based delays: `delay: ${index * 50}ms`

### Acceptance Criteria
- [ ] Search results fade in smoothly
- [ ] Staggered animation implemented (optional but preferred)
- [ ] Respects `prefers-reduced-motion` media query
- [ ] Animation doesn't cause performance issues
- [ ] Works for both initial load and subsequent searches

---

## Issue 4: Set Up ESLint Configuration for Frontend Code

**Labels**: `good first issue`, `code quality`, `tooling`

**Template**: Use "Good First Issue" template

### Description
Add ESLint configuration to ensure code quality and consistency across the frontend codebase. This will help catch bugs early and maintain code standards.

### Technical Details
- **Directory**: `frontend/`
- **Dependencies to add**: 
  - `eslint`
  - `@typescript-eslint/parser`
  - `@typescript-eslint/eslint-plugin`
  - `eslint-plugin-svelte`
  - Recommended: `eslint-config-prettier` (if using Prettier)
- **Config file**: Create `.eslintrc.js` or `.eslintrc.cjs` in `frontend/`
- **Recommended plugins**:
  - `eslint-plugin-svelte` for Svelte-specific rules
  - `@typescript-eslint` for TypeScript rules

### Configuration Template
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:svelte/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    browser: true,
    es6: true
  }
};
```

### Acceptance Criteria
- [ ] ESLint installed and configured
- [ ] Configuration file created
- [ ] npm/pnpm script added: `"lint": "eslint src --ext .ts,.js,.svelte"`
- [ ] Documentation updated (CONTRIBUTING.md)
- [ ] CI integration ready (can be separate issue)

---

## Issue 5: Add Focus Visible Indicators Throughout App

**Labels**: `help wanted`, `accessibility`, `ui/ux`

**Template**: Use "Feature Request" template

### Description
While some components have focus indicators, we need consistent, visible focus indicators across all interactive elements to meet WCAG 2.1 level AA standards and improve keyboard navigation experience.

### Current State
- Some components may have focus styles
- Not all interactive elements have visible focus indicators
- Focus indicators should be consistent across the app

### Expected Behavior
All interactive elements should have:
- Clear, visible focus indicator (2px+ outline/border)
- High contrast with background (meets WCAG contrast ratios)
- Consistent styling across components
- Optional: Custom focus ring matching design system

### Components to Update
- [ ] `BookCard.svelte` (already has some focus styles - verify/improve)
- [ ] `SearchBar.svelte`
- [ ] `FilterBar.svelte`
- [ ] All buttons
- [ ] All links
- [ ] Form inputs
- [ ] Modal dialogs (focus trap + indicators)

### Technical Details
- **Approach**: Add Tailwind utility classes or custom CSS
- **Tailwind option**: `focus:outline-2 focus:outline-academia-gold focus:outline-offset-2`
- **Custom option**: Create consistent focus utility class
- **Test**: Keyboard navigation (Tab through all interactive elements)

### Acceptance Criteria
- [ ] All interactive elements have visible focus indicators
- [ ] Focus indicators meet WCAG 2.1 AA contrast requirements
- [ ] Consistent styling across all components
- [ ] Tested with keyboard-only navigation
- [ ] Works in both light and dark themes

---

## Issue 6: Add "Similar Books" Recommendations on Detail Page

**Labels**: `enhancement`, `feature`, `help wanted`

**Template**: Use "Feature Request" template

### Description
When viewing a book's detail page, users should be able to discover similar books. This feature would use the existing vector similarity search to find books related to the current book.

### Expected Behavior
- On the book detail page (`/books/[id]`), add a "Similar Books" section
- Show 6-12 similar books in a horizontal scrollable grid or regular grid
- Use the existing `/recommend` API endpoint with the current book's embedding
- Optional: Show similarity score or "Match" indicator

### Technical Details
- **File to modify**: `frontend/src/routes/books/[id]/+page.svelte`
- **API endpoint**: Reuse existing `/recommend` endpoint
- **Component**: Could reuse `ResultsGrid.svelte` or create new `SimilarBooks.svelte`
- **Data**: Use current book's embedding or generate from book data

### API Considerations
- May need to modify API to accept book ID instead of just query text
- Or: Generate embedding from book's existing data (title, subjects, etc.)

### Acceptance Criteria
- [ ] "Similar Books" section appears on detail page
- [ ] Shows 6-12 similar books
- [ ] Books are actually similar (reasonable similarity scores)
- [ ] Section is visually distinct and well-integrated
- [ ] Loading state handled gracefully
- [ ] Error state handled (if API fails)

---

## Issue 7: Implement Undo/Redo for Swipe Actions

**Labels**: `enhancement`, `feature`, `help wanted`

**Template**: Use "Feature Request" template

### Description
Users should be able to undo their swipe actions (like/disike) in case they made a mistake. This would improve the user experience and make the app more forgiving.

### Expected Behavior
- Add "Undo" button or keyboard shortcut after a swipe
- Undo should restore the book to the swipe stack
- Redo functionality (optional but nice)
- Show a toast notification after undo/redo

### Technical Details
- **Files to modify**:
  - `frontend/src/lib/components/SwipeStack.svelte`
  - Possibly add state management for swipe history
- **Implementation approach**:
  - Store swipe history in a stack/array
  - Track: book, action (left/right), timestamp
  - Undo: Pop from history, restore to stack
  - Keyboard shortcut: `Cmd/Ctrl + Z` for undo, `Cmd/Ctrl + Shift + Z` for redo

### State Management
- Could use Svelte stores for swipe history
- Store structure:
```typescript
interface SwipeAction {
  book: Book;
  action: 'left' | 'right';
  timestamp: number;
}
```

### Acceptance Criteria
- [ ] Undo button appears after swiping
- [ ] Undo restores book to swipe stack
- [ ] Keyboard shortcuts work (Cmd/Ctrl+Z)
- [ ] History persists during session (optional: save to localStorage)
- [ ] Toast notification shows undo confirmation
- [ ] Works with both left and right swipes
- [ ] Redo functionality (optional)

---

## Issue 8: Add Book Cover Image Zoom on Hover/Click

**Labels**: `enhancement`, `feature`, `ui/ux`

**Template**: Use "Feature Request" template

### Description
Allow users to view book covers in larger size by zooming on hover (desktop) or click (mobile). This helps users better evaluate books, especially when covers are small in grid view.

### Expected Behavior
- **Desktop**: Hover over book cover → show zoomed version (tooltip/popover style)
- **Mobile**: Tap book cover → show zoomed version in modal/lightbox
- Zoomed image should be reasonably sized (not fullscreen, maybe 2-3x original)
- Smooth transition animation

### Technical Details
- **Files to modify**:
  - `frontend/src/lib/components/BookCard.svelte`
  - Create new `BookCoverZoom.svelte` component (optional)
- **Implementation options**:
  - Option 1: CSS-only zoom (transform: scale) on hover
  - Option 2: Separate zoom component/tooltip
  - Option 3: Lightbox modal for click-to-zoom
- **Image quality**: Use larger cover size for zoom (Open Library size 'L' or 'M')

### Acceptance Criteria
- [ ] Hover zoom works on desktop
- [ ] Click zoom works on mobile/touch devices
- [ ] Zoomed image is clear and properly sized
- [ ] Smooth animation/transition
- [ ] Works in both grid and detail views (optional)
- [ ] Accessible (keyboard navigation, focus management)

---

## Issue 9: Add Share Book Recommendations Functionality

**Labels**: `enhancement`, `feature`, `social`

**Template**: Use "Feature Request" template

### Description
Allow users to share book recommendations with others. This could include sharing individual books or entire recommendation lists.

### Expected Behavior
- Add "Share" button to book cards and detail pages
- Options:
  - Copy link to clipboard
  - Generate shareable URL (e.g., `/recommend?query=...`)
  - Social media sharing (Twitter, Facebook, etc.)
  - Export as text/image

### Technical Details
- **Files to modify**:
  - `frontend/src/lib/components/BookCard.svelte`
  - `frontend/src/routes/books/[id]/+page.svelte`
  - Create `ShareButton.svelte` component
- **APIs to use**:
  - Web Share API (native sharing on mobile)
  - Clipboard API for copy-to-clipboard
- **Shareable links**: Use query parameters to recreate recommendation

### Share Options
1. **Copy link**: Generate URL with search query
2. **Share text**: "Check out this book: [Title] by [Author]"
3. **Social media**: Pre-filled tweet/post
4. **Image**: Generate image card with book cover + info

### Acceptance Criteria
- [ ] Share button added to relevant components
- [ ] Copy link to clipboard works
- [ ] Shareable links recreate the recommendation
- [ ] Web Share API used where supported (mobile)
- [ ] Fallback for browsers without Web Share API
- [ ] Social media sharing works (optional)
- [ ] Toast notification confirms share action

---

## Issue 10: Set Up Prettier for Code Formatting

**Labels**: `good first issue`, `code quality`, `tooling`

**Template**: Use "Good First Issue" template

### Description
Add Prettier configuration to automatically format code for consistency. This should work alongside ESLint (see Issue #4).

### Technical Details
- **Directory**: `frontend/`
- **Dependencies to add**:
  - `prettier`
  - `prettier-plugin-svelte` (for Svelte file formatting)
  - `eslint-config-prettier` (to avoid ESLint conflicts)
- **Config file**: Create `.prettierrc` and `.prettierignore`
- **Format**: JSON or JS config file

### Configuration Template
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-svelte"],
  "overrides": [
    {
      "files": "*.svelte",
      "options": {
        "parser": "svelte"
      }
    }
  ]
}
```

### Acceptance Criteria
- [ ] Prettier installed and configured
- [ ] Configuration file created
- [ ] npm/pnpm script added: `"format": "prettier --write \"src/**/*.{js,ts,svelte}\""`
- [ ] `.prettierignore` file created
- [ ] ESLint configured to work with Prettier (if ESLint is set up)
- [ ] Documentation updated

---

## Issue 11: Add Pre-commit Hooks for Linting/Formatting

**Labels**: `good first issue`, `code quality`, `tooling`

**Template**: Use "Good First Issue" template

### Dependencies
- Requires Issues #4 (ESLint) and #10 (Prettier) to be completed first

### Description
Set up pre-commit hooks using Husky to automatically run linting and formatting before commits, ensuring code quality standards are maintained.

### Technical Details
- **Tool**: Husky + lint-staged
- **Dependencies to add**:
  - `husky` (dev dependency)
  - `lint-staged` (dev dependency)
- **Configuration**: Create `.husky/pre-commit` hook
- **lint-staged config**: Add to `package.json` or `.lintstagedrc`

### Setup Steps
1. Install Husky: `pnpm add -D husky`
2. Initialize: `npx husky install`
3. Create pre-commit hook
4. Configure lint-staged

### Acceptance Criteria
- [ ] Husky installed and initialized
- [ ] Pre-commit hook runs linting
- [ ] Pre-commit hook runs formatting (or formats on save)
- [ ] Hook prevents commits if linting fails
- [ ] Documentation updated with setup instructions
- [ ] Works on both Unix and Windows systems

---

## Issue 12: Improve Screen Reader Announcements for Dynamic Content

**Labels**: `help wanted`, `accessibility`

**Template**: Use "Feature Request" template

### Description
When search results update or content changes dynamically, screen readers should be properly notified. Currently, dynamic updates may not be announced, making the app less accessible.

### Expected Behavior
- When search results load, announce: "Search results updated. Found X books."
- When book is swiped, announce action
- When filters change, announce filter state
- Use ARIA live regions appropriately

### Technical Details
- **ARIA live regions**: Use `aria-live="polite"` or `aria-live="assertive"`
- **Components to update**:
  - `SearchBar.svelte` - announce search results
  - `SwipeStack.svelte` - announce swipe actions
  - `FilterBar.svelte` - announce filter changes
  - `ResultsGrid.svelte` - announce grid updates
- **Implementation**: Add `<div role="status" aria-live="polite">` or use existing elements

### Example
```svelte
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
  {announcement}
</div>
```

### Acceptance Criteria
- [ ] Search results updates are announced
- [ ] Swipe actions are announced
- [ ] Filter changes are announced
- [ ] Announcements are clear and informative
- [ ] Tested with VoiceOver (macOS/iOS) and NVDA (Windows)
- [ ] No duplicate announcements

---

## Priority Summary

### High Priority (Start Here)
1. Issue 4: ESLint Configuration
2. Issue 10: Prettier Setup
3. Issue 11: Pre-commit Hooks (depends on 4 & 10)

### Medium Priority (Good First Issues)
1. Issue 1: Hover Effects
2. Issue 2: Enhanced Alt Text
3. Issue 3: Fade-in Animations

### Lower Priority (More Complex)
1. Issue 5: Focus Indicators (broader scope)
2. Issue 6: Similar Books
3. Issue 7: Undo/Redo
4. Issue 8: Cover Zoom
5. Issue 9: Share Functionality
6. Issue 12: Screen Reader Announcements

---

**Note**: When creating these issues on GitHub, make sure to:
1. Use the appropriate template
2. Add relevant labels
3. Link to related issues if dependencies exist
4. Reference this document or the TODO.md for context
5. Assign appropriate milestones if using project management
