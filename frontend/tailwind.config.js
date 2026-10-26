/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        icesilver: {
          50: '#F6F8FA',
          100: '#EEF2F5',
          200: '#E2E7EC',
          DEFAULT: '#DDE3E8',
          300: '#DDE3E8',
          400: '#C8D1D8',
          500: '#AAB8C2',
          600: '#8A9BA8',
          700: '#697B89',
        },
        deepplum: {
          DEFAULT: '#3A0F34',
          800: '#3A0F34',
          900: '#3A0F34',
        },
        aubergine: {
          DEFAULT: '#3A0F34',
          800: '#3A0F34',
          900: '#3A0F34',
        },
        marigold: {
          50: '#FFFDF5',
          100: '#FEF9E6',
          200: '#FDF1C2',
          300: '#FBE593',
          400: '#F7D452',
          DEFAULT: '#EAAA00',
          500: '#EAAA00',
          600: '#C88F00',
          700: '#A17200',
          800: '#7E5900',
          900: '#5F4300',
        },
        radar: {
          critical: '#ef4444',
          warning: '#EAAA00',
          success: '#10b981',
          info: '#3A0F34',
        }
      }
    },
  },
  plugins: [],
}
