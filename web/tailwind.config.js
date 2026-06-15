/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0f0f1a',
          secondary: '#1a1a2e',
          card: '#16213e',
          cardHover: '#1a2744'
        },
        accent: {
          blue: '#4a90d9',
          purple: '#8e44ad',
          green: '#27ae60',
          amber: '#f39c12',
          red: '#e74c3c',
          pink: '#e91e63'
        },
        text: {
          primary: '#e8e8f0',
          secondary: '#8888aa',
          muted: '#555577'
        },
        border: {
          DEFAULT: '#2a2a4a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif']
      }
    },
  },
  plugins: [],
};
