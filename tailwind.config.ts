import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';
import animate from 'tailwindcss-animate';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          emerald: 'var(--brand-emerald, #0E4B45)',
          emeraldDeep: 'var(--brand-emeraldDeep, #072E2A)',
          gold: 'var(--brand-gold, #C7A86B)',
          goldSoft: 'var(--brand-goldSoft, #E6D7B3)',
          cream: 'var(--brand-cream, #F6F0E5)',
          mist: 'var(--brand-mist, #8FA49F)',
        },
      },
      fontFamily: {
        arabic: [
          '"Noto Naskh Arabic"',
          '"Noto Sans Arabic"',
          'Arial',
          'Tahoma',
          'sans-serif',
        ],
      },
      boxShadow: {
        glow: '0 10px 30px rgba(199,168,107,0.2)',
      },
    },
  },
  plugins: [typography, animate],
};

export default config;
