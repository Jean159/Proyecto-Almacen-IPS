/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        navy: {
          50: "#f4f7fb",
          100: "#e8eef6",
          200: "#cbd9ea",
          300: "#a5bcd8",
          400: "#7898c0",
          500: "#577aa8",
          600: "#42608c",
          700: "#374e72",
          800: "#31435f",
          900: "#2c3a50",
          950: "#17202e",
        },
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 8px 24px -12px rgb(15 23 42 / 0.18)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
