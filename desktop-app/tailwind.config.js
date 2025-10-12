// desktop-app/tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // This tells Tailwind to look in all JSX and JS files inside the src folder
    "./src/**/*.{js,jsx,ts,tsx}",

    // This tells Tailwind to also look at your HTML files for any utility classes
    "./*.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

