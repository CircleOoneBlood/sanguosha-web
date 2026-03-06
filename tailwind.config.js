/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 三国杀主题色
        parchment: "#f5e6c8",
        "ink-dark": "#2c1810",
        "ink-red": "#8b1a1a",
        "gold": "#c9a84c",
        "jade": "#2d6a4f",
        // 势力色
        wei: "#4a90d9",    // 魏·蓝
        shu: "#e74c3c",    // 蜀·红
        wu: "#27ae60",     // 吴·绿
        qun: "#8e44ad",    // 群·紫
      },
      fontFamily: {
        serif: ["Noto Serif SC", "serif"],
        sans: ["Noto Sans SC", "sans-serif"],
      },
      backgroundImage: {
        "card-back": "url('/assets/card-back.png')",
      },
    },
  },
  plugins: [],
};
