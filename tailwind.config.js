/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'tgs-dark': '#0a0f1c',
        'tgs-panel': '#111a2e',
        'tgs-primary': '#22d3ee',
        'tgs-accent': '#a855f7',
        'tgs-grv': '#fbbf24',
      },
    },
  },
  plugins: [],
}
