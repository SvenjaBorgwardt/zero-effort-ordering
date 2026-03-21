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
        },
        // Rebeccas UTE-Farben
        'ute': {
          'cream': '#F5F0EB',
          'warm-white': '#FDFCFA',
          'terracotta': '#A0522D',
          'terracotta-light': '#C0764A',
          'sage': '#7BA07B',
          'sage-light': '#C5D8C5',
          'dusty-rose': '#C4946C',
          'dusty-rose-light': '#E8D5C4',
          'taupe': '#8B7D6B',
          'charcoal': '#3D3229',
          'golden': '#C4A035',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
