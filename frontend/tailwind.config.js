/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      colors: {
        primary: {
          light: '#4B83DB',
          DEFAULT: '#1A56DB',
          dark: '#1E429F',
        },
        secondary: {
          light: '#9CA3AF',
          DEFAULT: '#6B7280',
          dark: '#4B5563',
        },
        success: {
          light: '#34D399',
          DEFAULT: '#10B981',
          dark: '#059669',
        },
        danger: {
          light: '#F87171',
          DEFAULT: '#EF4444',
          dark: '#DC2626',
        },
      },
    },
  },
  plugins: [],
}
