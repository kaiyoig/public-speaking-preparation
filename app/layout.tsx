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
  title: "Public Speaking Preparation",
  description:
    "Rehearse a speech in front of an AI Host that listens, watches, asks Questions and gives a spoken Reflection.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10">{children}</main>
      </body>
    </html>
  );
}
