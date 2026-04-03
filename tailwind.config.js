/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'selector', // <--- CHANGE THIS FROM 'class' TO 'selector'
  theme: {
    extend: {},
  },
  plugins: [],
}