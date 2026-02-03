/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#05070A",
        panel: "rgba(10, 14, 18, 0.72)",
        neon: {
          300: "#76FF9A",
          400: "#2CFF6D",
          500: "#00E85A",
          600: "#00B947"
        },
        line: "rgba(0, 232, 90, 0.18)"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        neon: "0 0 22px rgba(0,232,90,.35), 0 0 70px rgba(0,232,90,.12)",
        neonStrong: "0 0 30px rgba(0,232,90,.55), 0 0 120px rgba(0,232,90,.18)",
        panel: "0 12px 60px rgba(0,0,0,.55)"
      },
      backgroundImage: {
        noise:
          "radial-gradient(circle at 20% 10%, rgba(0,232,90,.18), transparent 45%), radial-gradient(circle at 80% 30%, rgba(0,232,90,.10), transparent 40%)",
        grid:
          "linear-gradient(to right, rgba(0,232,90,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,232,90,.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};
