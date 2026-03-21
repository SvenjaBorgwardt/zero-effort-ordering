/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'baeckerei': {
          'bg': '#FFF8F0',
          'card': '#FFFFFF',
          'accent': '#D97706',
          'accent-hover': '#B45309',
          'text': '#292524',
          'text-secondary': '#78716C',
          'gruen': '#16A34A',
          'gelb': '#EAB308',
          'rot': '#DC2626',
        }
      }
    },
  },
  plugins: [],
}
