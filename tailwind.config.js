/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#0B0E14',
        steel: '#161B22',
        'cyber-cyan': '#00F5FF',
        'deep-violet': '#7000FF',
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'sans-serif'],
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(0.98)' },
        },
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(5px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeOut: {
          '0%': { opacity: '0' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'fade-out': 'fadeOut 2s ease-in-out forwards',
      },
    },
  },
  plugins: [],
}
