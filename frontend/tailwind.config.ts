import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FAF8F5',
          100: '#F7F3EE',
          200: '#F0ECE4',
          300: '#E5E0D6',
          400: '#D4CDC0',
        },
        navy: {
          DEFAULT: '#1E2D3D',
          light: '#2C4054',
          pale: '#4A6580',
          dark: '#141F2B',
        },
        gold: {
          DEFAULT: '#C4A265',
          light: '#D4B87A',
          pale: '#E8D5A8',
          dark: '#A8884A',
        },
        ink: {
          DEFAULT: '#1C1C1C',
          light: '#4A4642',
          pale: '#8B8680',
        },
        paper: '#FFFFFF',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Lora', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
