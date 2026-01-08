/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// Dark Academia theme colors
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
			}
		}
	},
	plugins: [require('@tailwindcss/typography')]
};
