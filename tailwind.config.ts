import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wood: {
          950: '#1a0f0d',
          900: '#2C1B18',
          800: '#3a2420',
          700: '#4A2E2B',
          600: '#5e3b33',
        },
        brass: { DEFAULT: '#c9a24f', light: '#e8c97f', dark: '#8f6b2a' },
        jute: { DEFAULT: '#cdb891', dark: '#a8916a' },
      },
      fontFamily: {
        display: ['var(--font-display)', '"Palatino Linotype"', 'Palatino', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '0.85' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s ease-out both',
        'soft-pulse': 'soft-pulse 4s ease-in-out infinite',
        shimmer: 'shimmer 8s linear infinite',
        float: 'float 5s ease-in-out infinite',
      },
      backgroundSize: {
        'shimmer': '200% 100%',
      },
    },
  },
  plugins: [],
};

export default config;
