import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "PulseGrid Telemetry Dashboard",
  description: "High-performance real-time health and IoT telemetry control center.",
  openGraph: {
    title: "PulseGrid Telemetry Dashboard",
    description: "High-Performance Telemetry & IoT Health Streamer",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "PulseGrid telemetry data stream" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PulseGrid Telemetry Dashboard",
    description: "High-Performance Telemetry & IoT Health Streamer",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0c0b10",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
