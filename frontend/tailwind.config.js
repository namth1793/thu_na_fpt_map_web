/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fpt: {
          orange: '#F05A22',
          dark: '#C24A1A',
          light: '#FFF3EE',
          blue: '#003087',
        },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s ease forwards',
        'bounce-in': 'bounceIn 0.5s ease forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: 0 },
          '60%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
