/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js}",
    "./src/index.html",
    "./src/renderer.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        'serif': ['Playfair Display', 'Georgia', 'serif'],
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Monaco', 'monospace'],
      },
      colors: {
        primary: {
          50: '#fdf2f2',
          100: '#fce7e7',
          200: '#f9d5d5',
          300: '#f4b5b5',
          400: '#ec8888',
          500: '#de5a5a',
          600: '#ca3e3e',
          700: '#6b1f1f',
          800: '#5a1919',
          900: '#4d1717',
        },
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#1b4332',
          800: '#166534',
          900: '#14532d',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        background: '#FAFAF8',
        charcoal: '#1C1917',
      },
      boxShadow: {
        'medical': '0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.05)',
      },
      backgroundImage: {
        'paper': "url('/paper-texture.svg')",
        'gradient-warm': 'linear-gradient(135deg, #fafaf8 0%, #f5f5f0 100%)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}