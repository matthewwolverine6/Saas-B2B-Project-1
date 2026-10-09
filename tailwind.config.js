/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#FDFCFB',
          100: '#F9F8F6',
          200: '#F3EFEA',
          300: '#E7E0D6',
          400: '#D5CABB',
        },
        forest: {
          950: '#0B1510',
          900: '#0F1E17',
          800: '#152E22',
          700: '#1E3F2E',
          600: '#2A573F',
          500: '#3D7557',
          100: '#E7F0EB',
          50: '#F2F7F4',
        },
        terracotta: {
          600: '#AF573C',
          500: '#C86D51',
          400: '#D9866E',
          100: '#FAE8E2',
          50: '#FDF5F2',
        },
        graphite: '#1A1A1A',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(15, 30, 23, 0.05)',
        'card': '0 8px 30px -4px rgba(15, 30, 23, 0.07)',
        'card-hover': '0 16px 36px -6px rgba(15, 30, 23, 0.12)',
        'modal': '0 25px 50px -12px rgba(15, 30, 23, 0.25)',
      }
    },
  },
  plugins: [],
}
