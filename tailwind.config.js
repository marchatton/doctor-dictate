/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        'serif': ['Playfair Display', 'Georgia', 'serif'],
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'ui-monospace', 'monospace']
      },
      colors: {
        primary: {
          700: '#6B1F1F',
          600: '#ca3e3e',
          400: '#de5a5a'
        },
        secondary: {
          600: '#16a34a',
          700: '#1b4332'
        }
      }
    }
  },
  plugins: []
}