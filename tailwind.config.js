/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'app-bg': '#0f111a',
        'card-bg': '#1a1d2e',
        'toolbar-bg': '#2a2d3e',
      },
    },
  },
  plugins: [],
};
