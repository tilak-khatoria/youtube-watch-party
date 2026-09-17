/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        oled: '#000000',
        'surface-dark': '#131313',
        'surface-lowest': '#0e0e0e',
        'surface-low': '#1b1b1b',
        'surface-card': '#1f1f1f',
        'surface-high': '#2a2a2a',
        'surface-highest': '#353535',
        accent: {
          DEFAULT: '#06B6D4',
          hover: '#0891B2',
          light: '#4CD7F6',
        },
        'status-live': '#10B981',
        text: {
          primary: '#FFFFFF',
          secondary: '#A3A3A3',
          muted: '#737373',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'oled-2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
        'oled-card': '0 10px 30px -10px rgba(0, 0, 0, 0.7)',
        'cyan-glow': '0 0 15px rgba(6, 182, 212, 0.35)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up': 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};
