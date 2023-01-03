/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './../views/*.html.twig'
  ],
  safelist: [
    '#nav a.activepage',
	'.token.punctuation',
	'.token.operator',
	'.token.string',
	'.token.keyword',
	'.token.variable',
	'.token.property',
	'.bg-emerald-50/50',
	'.w-full'
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