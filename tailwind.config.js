/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:        'rgb(var(--color-navy)      / <alpha-value>)',
        'slate-card':'rgb(var(--color-card)      / <alpha-value>)',
        offwhite:    'rgb(var(--color-text)      / <alpha-value>)',
        muted:       'rgb(var(--color-muted)     / <alpha-value>)',
        violet: {
          DEFAULT:   'rgb(var(--color-accent)    / <alpha-value>)',
          dark:      'rgb(var(--color-accent-dk) / <alpha-value>)',
        },
        amber:       'rgb(var(--color-amber)     / <alpha-value>)',
        crimson:     '#EF4444',
        emerald:     '#22C55E',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(5px)' },
        },
        xp_pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        slide_in: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        heart_lose: {
          '0%,100%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.4)', filter: 'brightness(1.5)' },
          '60%': { transform: 'scale(0.8)' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
        xp_pop: 'xp_pop 0.4s ease-in-out',
        slide_in: 'slide_in 0.3s ease-out',
        heart_lose: 'heart_lose 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
};
