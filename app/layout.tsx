import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Firehouse GIS — WUI Vulnerability Viewer",
  description: "Offline-capable parcel wildfire vulnerability & egress viewer for firehouse and field use.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#c62828",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, height: "100dvh", overflow: "hidden", fontFamily: "system-ui" }}>
        {children}
      </body>
    </html>
  );
}
