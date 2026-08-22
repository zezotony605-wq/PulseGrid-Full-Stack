import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pulsegrid-telemetry.zezotony605.chatgpt.site"),
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
