import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Variable in weight and width: condensed for display, normal width for body text.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rhetor",
  description:
    "Rehearse a speech in front of an AI host that listens, watches, asks questions and gives spoken feedback.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
