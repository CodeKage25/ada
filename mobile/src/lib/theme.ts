/** Ada design tokens, ported from the design canvas and the web app.
 *  Warm paper + near-black ink, one indigo accent; dark mode mirrors the
 *  same relationships at lower luminance. */
import { useColorScheme } from "react-native";

export const palettes = {
  light: {
    bg: "#faf9f6",
    surface: "#ffffff",
    surface2: "#f4f2ec",
    ink: "#17150f",
    muted: "#6f6a5e",
    line: "#e7e4dc",
    accent: "#4338ca",
    accentInk: "#ffffff",
    accentSoft: "#eceafd",
    success: "#1a7f4b",
    successSoft: "#e3f4ea",
    warn: "#92600a",
    warnSoft: "#fbf0d9",
    danger: "#b42318",
    dangerSoft: "#fbe9e7",
  },
  dark: {
    bg: "#12110e",
    surface: "#1a1916",
    surface2: "#201f1b",
    ink: "#f2f0ea",
    muted: "#a09a8c",
    line: "#2b2925",
    accent: "#8b85f4",
    accentInk: "#12110e",
    accentSoft: "#232145",
    success: "#4ade80",
    successSoft: "#14291c",
    warn: "#fbbf24",
    warnSoft: "#2b2210",
    danger: "#f87171",
    dangerSoft: "#2e1715",
  },
} as const;

export type Palette = { [K in keyof (typeof palettes)["light"]]: string };

export function useTheme(): Palette {
  const scheme = useColorScheme();
  return scheme === "dark" ? palettes.dark : palettes.light;
}

export const fonts = {
  serif: "InstrumentSerif_400Regular",
  serifItalic: "InstrumentSerif_400Regular_Italic",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemiBold: "Inter_600SemiBold",
} as const;

export const radius = { card: 18, field: 12, pill: 999 } as const;
