/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        background: '#12172b',
        surface: '#1e2345',
        card: '#2c3357',
        primary: '#00bcd4',
        accent: '#ff9800',
        soft: '#3a416f',
        lightText: '#e0e0e0',
        mutedText: '#9e9e9e',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
}
