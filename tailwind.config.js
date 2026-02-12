/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#3B82F6',
        cta: '#F97316',
        background: '#F8FAFC',
        'text-color': '#1E293B',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'clay': '8px 8px 16px 0px rgba(0, 0, 0, 0.1), inset 8px 8px 16px 0px rgba(255, 255, 255, 0.4), inset -8px -8px 16px 0px rgba(0, 0, 0, 0.05)',
        'clay-sm': '4px 4px 8px 0px rgba(0, 0, 0, 0.1), inset 4px 4px 8px 0px rgba(255, 255, 255, 0.4), inset -4px -4px 8px 0px rgba(0, 0, 0, 0.05)',
        'clay-inset': 'inset 6px 6px 12px 0px rgba(0, 0, 0, 0.1), inset -6px -6px 12px 0px rgba(255, 255, 255, 0.8)',
      },
      borderRadius: {
        'clay': '1rem', // 16px
        'clay-lg': '1.5rem', // 24px
      }
    },
  },
  plugins: [],
}
