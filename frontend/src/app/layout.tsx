import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: {
    default: "Ada — the career agent that gets you hired",
    template: "%s · Ada",
  },
  description:
    "Ada rewrites your CV for the role you want — in any industry — finds your best-fit jobs, and coaches you through the interview. One agent, end to end.",
  // Installed-app behavior on iOS: full-screen, titled, paper status bar.
  appleWebApp: {
    capable: true,
    title: "Ada",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Extend the canvas under the home indicator; the floating tab bar and
  // fixed CTAs pad themselves with env(safe-area-inset-bottom).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#12110e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply stored theme before paint to avoid a flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.theme==='dark'||(!('theme' in localStorage)&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${instrumentSerif.variable}`}>{children}</body>
    </html>
  );
}
