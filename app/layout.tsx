import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "./sw-register";
import { AuthProvider } from "./providers";
import { ThemeProvider } from "../lib/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "GameDay Soccer",
  description:
    "Deterministic youth-soccer rotation engine and live game-day assistant.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "GameDay Soccer",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#030712" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before React hydrates to set the correct class without a flash.
// Dark is the default brand theme; light is opt-in.
const themeInitScript = `(function(){
  var s=localStorage.getItem('gameday-theme');
  var dark=!s||s==='dark'||(s==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  if(dark)document.documentElement.classList.add('dark');
})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
