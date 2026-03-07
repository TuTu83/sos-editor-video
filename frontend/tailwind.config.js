/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00c3ff', // Cyan
          hover: '#00a3d9',
          glow: 'rgba(0, 195, 255, 0.5)',
        },
        secondary: {
          DEFAULT: '#7000ff', // Purple
          hover: '#5a00cc',
          glow: 'rgba(112, 0, 255, 0.5)',
        },
        accent: {
          DEFAULT: '#ff0055', // Pink/Red for highlights
          hover: '#cc0044',
        },
        dark: {
          DEFAULT: '#0f172a', // Slate 900
          lighter: '#1e293b', // Slate 800
          card: '#1e293b', // Slate 800
          border: '#334155', // Slate 700
        },
        background: '#020617', // Slate 950 (Deepest dark)
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'], // Ideally add this font
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
}
