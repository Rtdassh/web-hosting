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
    },
  },
  plugins: [],
}