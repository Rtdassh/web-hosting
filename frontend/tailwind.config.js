/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EAF7F1',
          100: '#CFE4D6',
          500: '#28B586',
          600: '#239C76',
          700: '#1C7F62',
        },

        navy: {
          700: '#2E4A5A',
          800: '#1F3141',
          900: '#172838',
        },
      },
      transitionTimingFunction: {
        'emil-out': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'emil-in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
        'emil-spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.1)',
      },
      keyframes: {
        'modal-enter': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'subtle-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(0.985)' },
        },
      },
      animation: {
        'modal-enter': 'modal-enter 220ms cubic-bezier(0.23, 1, 0.32, 1) forwards',
        'fade-in': 'fade-in 180ms cubic-bezier(0.23, 1, 0.32, 1) forwards',
        'subtle-pulse': 'subtle-pulse 2.2s cubic-bezier(0.77, 0, 0.175, 1) infinite',
      },
    },
  },
  plugins: [],
}
