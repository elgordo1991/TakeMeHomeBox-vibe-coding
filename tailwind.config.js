/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        earth: {
          50: '#fefdf8',
          100: '#fdf9ed',
          200: '#f9f0d4',
          300: '#f3e4b3',
          400: '#ebd388',
          500: '#e1c05f',
          600: '#d4a843',
          700: '#b18936',
          800: '#8f6d31',
          900: '#755a2b',
        },
        warm: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cec7',
          400: '#d2bab0',
          500: '#bfa094',
          600: '#a18072',
          700: '#977669',
          800: '#846358',
          900: '#43302b',
        },
        // Dark theme colors
        'deep-blue': '#0A0F2C',
        'silver': '#C0C0C0',
        'silver-light': '#E5E5E5',
        'dark-blue': '#1E293B',
        'dark-blue-light': '#334155',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite alternate',
        'press-down': 'pressDown 0.1s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'gradient-shimmer': 'gradientShimmer 8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pressDown: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.95)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(192, 192, 192, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(192, 192, 192, 0.8)' },
        },
        gradientShimmer: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '25%': { backgroundPosition: '100% 50%' },
          '50%': { backgroundPosition: '50% 100%' },
          '75%': { backgroundPosition: '50% 0%' },
        },
      },
      backgroundImage: {
        'gradient-shimmer': 'linear-gradient(135deg, #0A0F2C 0%, #1E293B 25%, #0A0F2C 50%, #334155 75%, #0A0F2C 100%)',
      },
      backgroundSize: {
        'shimmer': '400% 400%',
      },
      boxShadow: {
        'silver-glow': '0 0 10px rgba(192, 192, 192, 0.5)',
        'silver-glow-lg': '0 0 20px rgba(192, 192, 192, 0.7)',
      },
    },
  },
  plugins: [],
};