/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class', // Use class-based dark mode
	theme: {
		extend: {
			screens: {
				'xs': '475px',
				'3xl': '1920px', // Ultra-wide screens
				'landscape': { 'raw': '(orientation: landscape) and (max-height: 500px)' },
			},
			colors: {
				// Dark Academia theme colors (for dark mode)
				academia: {
					dark: '#1a1a1a',
					darker: '#0f0f0f',
					light: '#2d2d2d',
					lighter: '#3d3d3d',
					accent: '#8b7355',
					gold: '#d4af37',
					cream: '#f5f5dc',
					paper: '#faf8f3'
				}
			},
			fontFamily: {
				serif: ['Georgia', 'Times New Roman', 'serif'],
				sans: ['Inter', 'system-ui', 'sans-serif']
			},
			fontSize: {
				'xs': ['0.75rem', { lineHeight: '1rem' }],
				'sm': ['0.875rem', { lineHeight: '1.25rem' }],
				'base': ['1rem', { lineHeight: '1.5rem' }],
				'lg': ['1.125rem', { lineHeight: '1.75rem' }],
				'xl': ['1.25rem', { lineHeight: '1.75rem' }],
				'2xl': ['1.5rem', { lineHeight: '2rem' }],
				'3xl': ['1.875rem', { lineHeight: '2.25rem' }],
				'4xl': ['2.25rem', { lineHeight: '2.5rem' }],
				'5xl': ['3rem', { lineHeight: '1' }],
			},
			// Custom colors that change based on theme
			backgroundColor: {
				'base': 'var(--bg-base)',
				'surface': 'var(--bg-surface)',
				'elevated': 'var(--bg-elevated)',
			},
			textColor: {
				'primary': 'var(--text-primary)',
				'secondary': 'var(--text-secondary)',
				'muted': 'var(--text-muted)',
			},
			borderColor: {
				'default': 'var(--border-default)',
			}
		}
	},
	plugins: [require('@tailwindcss/typography')]
};
