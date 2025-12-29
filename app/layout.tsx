import type { Metadata } from "next";
import "./globals.css";
import FontLoader from "./components/FontLoader";

export const metadata: Metadata = {
  title: "DartClub - Speel 501 en meer",
  description: "Moderne mobile-first dart app voor het spelen van 501 en het bijhouden van statistieken",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
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
