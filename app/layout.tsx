import type { Metadata, Viewport } from "next";
import { ConvexClientProvider } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nebuchadnezzar",
  description: "Claude Code UI",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-base-100 text-base-content select-none">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
