/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bebas Neue', 'Impact', 'sans-serif'],
        body: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: '#0a1230',
        gold: '#f4c430',
        teamA: '#2563eb',
        teamB: '#dc2626',
        turn: '#22c55e',
      },
    },
  },
  plugins: [],
}
