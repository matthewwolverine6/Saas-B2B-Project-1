/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0B0C0A',
        panel: '#000000',
        border: '#262825',
        signal: '#00E676',
        danger: '#FF3B30',
        muted: '#8E928C',
        primary: '#F2F4F0',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
