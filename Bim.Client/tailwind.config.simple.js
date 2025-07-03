/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4f3ff',
          100: '#ebe9fe',
          200: '#d9d6fe',
          300: '#bfb8fc',
          400: '#a193f8',
          500: '#8470f3',
          600: '#7554ea',
          700: '#6644d6',
          800: '#5537b4',
          900: '#472f93',
          950: '#2a1a5e'
        }
      },
      fontFamily: {
        'sans': ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
