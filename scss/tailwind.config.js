/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './../views/*.html.twig'
  ],
  safelist: [
    '#nav a.activepage',
  ],
  theme: {
    typography: require('./typography'),
    extend: {
    },
  },
  plugins: [
	require('@tailwindcss/typography')
	],
}