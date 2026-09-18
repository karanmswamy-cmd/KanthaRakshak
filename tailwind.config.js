/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hospital: {
          teal: '#0d9488',
          tealLight: '#f0fdfa',
          tealBorder: '#ccfbf1',
          green: '#10b981',
          greenLight: '#ecfdf5',
          greenBorder: '#a7f3d0',
          amber: '#f59e0b',
          amberLight: '#fffbeb',
          amberBorder: '#fde68a',
          rose: '#ef4444',
          roseLight: '#fef2f2',
          roseBorder: '#fecaca',
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          textMuted: '#64748b',
          textDark: '#0f172a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
