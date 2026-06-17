/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas:    '#F9F8F4',
        forest:    '#2D3A31',
        sage:      '#8C9A84',
        clay:      '#DCCFC2',
        stone:     '#E6E2DA',
        terra:     '#C27B66',
        parchment: '#F2F0EB',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft:  '0 4px 6px -1px rgba(45,58,49,0.05)',
        card:  '0 10px 15px -3px rgba(45,58,49,0.07)',
        lift:  '0 20px 40px -10px rgba(45,58,49,0.12)',
        bloom: '0 25px 50px -12px rgba(45,58,49,0.18)',
      },
      borderRadius: {
        card: '24px',
      },
      keyframes: {
        slideIn: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        slideIn: 'slideIn 0.35s ease-out',
        fadeUp:  'fadeUp 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};
