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
        brand: {
          50: '#fdf2f4',
          100: '#fce7ea',
          200: '#f9d0d7',
          300: '#f4a9b7',
          400: '#ec738c',
          500: '#e14568',
          600: '#cd2850',
          700: '#ac1d3f',
          800: '#901b38',
          900: '#7b1b33',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-rose': '0 0 35px -5px rgba(244, 63, 94, 0.35)',
        'glow-indigo': '0 0 35px -5px rgba(99, 102, 241, 0.35)',
        'glow-purple': '0 0 35px -5px rgba(168, 85, 247, 0.35)',
        'glow-cyan': '0 0 35px -5px rgba(6, 182, 212, 0.35)',
        'glass-sm': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glass-lg': '0 12px 40px -10px rgba(0, 0, 0, 0.12)',
        'glass-dark-lg': '0 20px 50px -15px rgba(0, 0, 0, 0.6)',
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.05)' },
        },
        floatReverse: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(20px) scale(0.95)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.8' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'float-slow': 'floatSlow 8s ease-in-out infinite',
        'float-reverse': 'floatReverse 10s ease-in-out infinite',
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
