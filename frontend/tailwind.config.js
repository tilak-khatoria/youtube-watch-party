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
        void: '#0e0e13',
        'surface-low': '#131319',
        'surface-card': '#19191f',
        'surface-high': '#1f1f26',
        'surface-highest': '#25252d',
        'surface-pure': '#000000',
        'electric-violet': '#a8a4ff',
        'electric-cyan': '#00d2fd',
        'kinetic-purple': '#6C63FF',
        'kinetic-cyan': '#00D4FF',
        'on-surface': '#f9f5fd',
        'on-surface-variant': '#acaab1',
        'ghost-border': 'rgba(72, 71, 77, 0.15)',
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
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Space Grotesk', 'JetBrains Mono', 'monospace'],
        space: ['Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        'oled': '0 20px 40px -15px rgba(0, 0, 0, 0.8)',
        'oled-sm': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'accent-subtle': '0 0 20px -5px rgba(14, 165, 233, 0.25)',
        'kinetic-bloom': '0 20px 40px rgba(108, 99, 255, 0.18)',
        'cyan-bloom': '0 20px 40px rgba(0, 210, 253, 0.18)',
      },
      backgroundImage: {
        'kinetic-gradient': 'linear-gradient(135deg, #6C63FF 0%, #00D4FF 100%)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};
