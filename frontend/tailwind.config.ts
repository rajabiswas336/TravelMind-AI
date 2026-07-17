import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#12162B",     // primary text / dark surfaces
        dusk: "#1E2542",    // deep indigo, hero/board background
        paper: "#ECEFE9",   // cool ticket-stock light surface
        runway: "#2FBF91",  // teal-green: active / success
        amber: "#FFB648",   // warm accent: highlights, boarding-call
        line: "#333A5C",    // hairline dividers on dark surfaces
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
