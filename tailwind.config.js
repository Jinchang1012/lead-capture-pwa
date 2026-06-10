/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 展場 dark mode 配色：高對比、夜間不刺眼
        bg: '#09090b',
        surface: '#18181b',
        accent: '#10b981'
      }
    }
  },
  plugins: []
}
