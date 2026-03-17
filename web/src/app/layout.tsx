import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anki Dict - Batch Word Card Generator",
  description: "Paste English words, generate Duolingo-style Anki flashcards, and export as CSV",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
