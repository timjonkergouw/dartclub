import type { Metadata, Viewport } from "next";
import "./globals.css";
import FontLoader from "./components/FontLoader";

export const metadata: Metadata = {
  title: "DartClub - Speel 501 en meer",
  description: "Moderne mobile-first dart app voor het spelen van 501 en het bijhouden van statistieken",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0A294F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="font-sans antialiased">
        <FontLoader />
        {children}
      </body>
    </html>
  );
}
