import type { CSSProperties } from "react";

/** Shared hero H1 gradient (matches design spec). Use with responsive font classes on the element. */
export const heroTitleGradientStyle: CSSProperties = {
  fontFamily: "var(--font-poppins), ui-sans-serif, sans-serif",
  background:
    "linear-gradient(90deg, rgb(0, 0, 0) 0%, rgb(9, 3, 1) 2.1478%, rgb(18, 6, 2) 4.2956%, rgb(36, 12, 4) 8.5912%, rgb(73, 25, 9) 17.182%, rgb(109, 37, 13) 25.774%, rgb(145, 50, 18) 34.365%, rgb(200, 68, 24) 51.868%, rgb(255, 87, 31) 69.371%, rgb(191, 65, 23) 77.028%, rgb(128, 44, 16) 84.686%, rgb(96, 33, 12) 88.514%, rgb(64, 22, 8) 92.343%, rgb(32, 11, 4) 96.171%, rgb(16, 5, 2) 98.086%, rgb(0, 0, 0) 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};
