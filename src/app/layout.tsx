import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Idol Photo Booth",
  description: "A desktop-style idol photo booth for template selfies."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="image" href="/loading-background-fast.jpg" type="image/jpeg" />
      </head>
      <body className="loading-page-base">{children}</body>
    </html>
  );
}
