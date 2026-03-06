/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        colors: {
            primary: '#00c3ff',
            secondary: '#7000ff',
            dark: '#1a1a1a',
            darker: '#121212'
        },
        fontFamily: {
            sans: ['Inter', 'sans-serif'],
        }
    },
  },
  plugins: [],
}
