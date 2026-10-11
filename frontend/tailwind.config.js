/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        'none': '0px',
        'sm': '6px',
        DEFAULT: '8px', 
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 2px 4px rgba(99, 102, 241, 0.06)',
        DEFAULT: '0 4px 10px rgba(99, 102, 241, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
        'md': '0 6px 14px -2px rgba(99, 102, 241, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)',
        'lg': '0 12px 24px -4px rgba(99, 102, 241, 0.14), 0 4px 8px rgba(0, 0, 0, 0.04)',
        'xl': '0 20px 30px -8px rgba(99, 102, 241, 0.16), 0 6px 12px rgba(0, 0, 0, 0.05)',
        '2xl': '0 25px 50px -12px rgba(99, 102, 241, 0.2)',
        'clay': '0 12px 24px -6px rgba(99, 102, 241, 0.14), inset 0 3px 6px rgba(255, 255, 255, 0.95), inset 0 -3px 6px rgba(99, 102, 241, 0.12)',
        'clay-sm': '0 4px 8px -2px rgba(99, 102, 241, 0.12), inset 0 2px 4px rgba(255, 255, 255, 0.95), inset 0 -2px 4px rgba(99, 102, 241, 0.14)',
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
        /* Iris & Electric Indigo Claymorphic Theme (Primary System Theme) */
        tomato: {
          50: '#f5f3ff',   // Softest lavender-indigo clay surface
          100: '#ede9fe',  // Tinted clay highlight
          200: '#c7d2fe',  // Soft clay border & bevel line
          300: '#a5b4fc',  // Clay contour
          400: '#818cf8',  // Soft primary clay accent
          500: '#6366f1',  // Signature Iris / Indigo Clay
          600: '#4f46e5',  // Vibrant 3D clay action
          700: '#4338ca',  // Deep bevel shadow contour
          800: '#3730a3',  // Rich contrast clay typography
          900: '#312e81',  // Deep royal dark text
        },
        clay: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        }
      },
    },
  },
  plugins: [],
}
