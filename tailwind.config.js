/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',
        secondary: '#A78BFA',
        cta: '#22C55E',
        background: '#FAF5FF',
        'text-color': '#4C1D95',
      },
      fontFamily: {
        sans: ['Public Sans', 'sans-serif'],
        serif: ['Libre Bodoni', 'serif'],
      },
    },
  },
  plugins: [],
}
