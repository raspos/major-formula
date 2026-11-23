/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        green: { deep: "#14352A", mid: "#2D5A46", soft: "#DCE6DF" },
        ivory: { DEFAULT: "#F6F1E6", dark: "#ECE4D2" },
        gold: { DEFAULT: "#A8854A", light: "#D9C69C" },
        charcoal: { DEFAULT: "#1E2220", soft: "#4A504C" },
      },
      fontFamily: {
        serif: ['"Noto Serif KR"', "Georgia", "serif"],
        sans: ['"Noto Sans KR"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
