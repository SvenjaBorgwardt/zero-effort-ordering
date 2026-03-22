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
          'bg': '#F0EDFA',
          'card': '#FFFFFF',
          'accent': '#6D28D9',
          'accent-hover': '#5B21B6',
          'text': '#1E1B2E',
          'text-secondary': '#6B6880',
          'gruen': '#16A34A',
          'gelb': '#EAB308',
          'rot': '#DC2626',
        }
      }
    },
  },
  plugins: [],
}
