/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ember: "#f97316",
        storm: "#102a43",
        moss: "#125b50",
        sand: "#f6ead8",
        blush: "#f97373"
      },
      boxShadow: {
        panel: "0 18px 40px rgba(9, 30, 66, 0.18)"
      },
      fontFamily: {
        sans: ['"Avenir Next"', '"Segoe UI"', "sans-serif"]
      }
    }
  },
  plugins: []
};
