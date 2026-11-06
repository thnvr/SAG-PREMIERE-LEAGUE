/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        xs: '420px',
      },
      colors: {
        pitch: {
          dark: '#14130d',
          black: '#0d0c07',
          card: '#1d1b12',
          border: '#332f1f',
          gold: '#ffd000', // Card Solid Yellow
          goldLight: '#fde047',
          goldDark: '#b89000',
          textMuted: '#9e9779',
        },
        midnight: '#14130d',
        charcoal: '#1d1b12',
        'charcoal-light': '#332f1f',
        electric: '#ffd000', // Replaced green with Card Yellow
        'electric-dark': '#b89000',
        gold: '#ffd000',
        'gold-dark': '#b89000',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'sold-stamp': 'soldStamp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'bid-pulse': 'bidPulse 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        soldStamp: {
          '0%': { transform: 'scale(3) rotate(-15deg)', opacity: '0' },
          '60%': { transform: 'scale(0.9) rotate(-10deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(-12deg)', opacity: '1' },
        },
        bidPulse: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
