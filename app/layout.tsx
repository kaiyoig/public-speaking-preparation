import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10">{children}</main>
      </body>
    </html>
  );
}
