/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class', // Use class-based dark mode
	theme: {
		extend: {
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
