/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tomato: {
          50: '#fff5f2',
          100: '#ffe6df',
          200: '#ffcfc3',
          300: '#ffa794',
          400: '#ff7256',
          500: '#FF6347', // Primary Tomato
          600: '#e0482c',
          700: '#bc361d',
          800: '#9b2e1b',
          900: '#802a1b',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          150: '#eceef1',
          200: '#e5e7eb',
          250: '#dadde2',
          300: '#d1d5db',
          400: '#9ca3af',
          55: '#f6f7f9',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        dark: {
          50: '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          850: '#1e1e1e',
          900: '#111111', // Black Text
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
