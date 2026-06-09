import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "./sw-register";
import { AuthProvider } from "./providers";

export const metadata: Metadata = {
  title: "GameDay Soccer",
  description:
    "Deterministic youth-soccer rotation engine and live game-day assistant.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "GameDay Soccer",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
