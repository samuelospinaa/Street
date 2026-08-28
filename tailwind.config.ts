import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        carbon: {
          DEFAULT: '#0B0B0B',
          soft: '#1a1a1a',
          line: '#262626',
        },
        amber: {
          DEFAULT: '#F7A818',
          dim: '#c9880f',
        },
      },
      fontFamily: {
        display: ['var(--font-anton)', 'Impact', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sticker: '0 10px 24px -8px rgba(0,0,0,.9), 0 2px 6px rgba(0,0,0,.6)',
        lift: '0 20px 45px -25px rgba(0,0,0,1)',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'slide-up': 'slide-up .25s ease-out',
        pop: 'pop .3s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
