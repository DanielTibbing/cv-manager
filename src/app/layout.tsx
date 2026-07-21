import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import "@/styles/resume.css";

// display: "block" — the resume must never render with fallback metrics,
// or measured block heights (and therefore pagination) would drift.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "block",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "block",
});

export const metadata: Metadata = {
  title: "CV Manager",
  description: "Local-first resume builder with high-fidelity PDF export",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sourceSerif.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
