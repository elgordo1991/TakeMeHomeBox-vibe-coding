/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm, friendly palette
        canvas: '#FAF6F0',        // page background (cream)
        surface: '#FFFFFF',       // cards, sheets
        sand: '#F3ECE2',          // subtle fills, chips, inputs on cards
        line: '#EBE2D6',          // hairline borders
        'line-strong': '#D9CCBC', // stronger borders
        ink: '#2B211C',           // primary text
        muted: '#6B5D53',         // secondary text
        subtle: '#7D7066',        // tertiary text / placeholders
        accent: {
          DEFAULT: '#F26B3A',     // tangerine
          dark: '#D9542A',
          soft: '#FFE8DC',
        },
        leaf: {
          DEFAULT: '#3F8F6B',
          soft: '#E3F2EA',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(43,33,28,0.04), 0 4px 16px rgba(43,33,28,0.06)',
        lift: '0 2px 4px rgba(43,33,28,0.06), 0 12px 32px rgba(43,33,28,0.12)',
        accent: '0 8px 24px rgba(242,107,58,0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
        'bounce-gentle': 'bounceGentle 3s ease-in-out infinite',
        'press-down': 'pressDown 0.1s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pressDown: { '0%': { transform: 'scale(1)' }, '100%': { transform: 'scale(0.96)' } },
      },
    },
  },
  plugins: [],
};
