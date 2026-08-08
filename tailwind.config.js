/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          1: '#05070C',
          2: '#0A0D12',
          3: '#0F131C',
          4: '#161D2B',
          5: '#1E2636',
        },
        accent: {
          primary: '#38BDF8',
          secondary: '#6EE7B7',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
      },
      borderRadius: {
        pill: '999px',
      },
    },
  },
  plugins: [],
}
