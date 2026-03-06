/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'devnotes-pulse': {
          '0%': { boxShadow: '0 0 0 0 rgba(229, 62, 62, 0.7)' },
          '70%': { boxShadow: '0 0 0 10px rgba(229, 62, 62, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(229, 62, 62, 0)' },
        },
        'devnotes-fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '20%': { opacity: '1', transform: 'translateY(0)' },
          '80%': { opacity: '1', transform: 'translateY(-6px)' },
          '100%': { opacity: '0', transform: 'translateY(-12px)' },
        },
      },
      animation: {
        'devnotes-pulse': 'devnotes-pulse 1s infinite',
        'devnotes-fade-up': 'devnotes-fade-up 1.2s ease-out',
      },
    },
  },
};
