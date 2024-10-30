/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,hbs}"],
  theme: {
    extend: {
      colors: {
        "black-custom": "#2C2C2C",
        "gray-custom": "#2B4162",
      },
      backgroundImage: {
        "custom-radial":
          "radial-gradient(circle at 24.1% 68.8%, rgb(50, 50, 50) 0%, rgb(0, 0, 0) 99.4%)",
      },
    },
  },
  plugins: [],
};
