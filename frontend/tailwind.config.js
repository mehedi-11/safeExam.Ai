/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        'none': '4px',
        'sm': '4px',
        DEFAULT: '4px', 
        'md': '4px',
        'lg': '4px',
        'xl': '4px',
        '2xl': '4px',
        '3xl': '4px',
        'full': '50%', // Icons/Avatars 50%
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 2px 0 rgb(0 0 0 / 0.05)', // Flatter shadows
        'md': '0 2px 4px -1px rgb(0 0 0 / 0.05)',
        'lg': '0 4px 6px -1px rgb(0 0 0 / 0.05)',
        'xl': '0 4px 6px -1px rgb(0 0 0 / 0.05)',
        '2xl': '0 4px 6px -1px rgb(0 0 0 / 0.05)',
      },
      colors: {
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
        },
        lime: {
          50: '#f7ffe6',
          100: '#ebffc2',
          200: '#dbff99',
          300: '#c8ff66',
          400: '#b7ff33',
          500: '#B6FF00', // Lime
          600: '#92cc00',
          700: '#6d9900',
          800: '#496600',
          900: '#243300',
        },
        tomato: {
          50: '#fff0ec',
          100: '#ffdcd3',
          200: '#ffbfae',
          300: '#ff987c',
          400: '#ff6742',
          500: '#ff4c24', // Tomato
          600: '#e53610',
          700: '#c0270a',
          800: '#9f230d',
          900: '#83220f',
        }
      },
    },
  },
  plugins: [],
}
