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
          'bg': '#EBE5F6',
          'card': '#FFFFFF',
          'accent': '#7C3AED',
          'accent-hover': '#6D28D9',
          'text': '#1A1333',
          'text-secondary': '#6E6589',
          'gruen': '#059669',
          'gelb': '#D97706',
          'rot': '#DC2626',
        }
      }
    },
  },
  plugins: [],
}
