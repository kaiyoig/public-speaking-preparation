import type { Metadata } from 'next'
import { Archivo, Space_Grotesk } from 'next/font/google'
import { INTRO_SCRIPT } from '@/components/intro'
import OpenCvScript from './components/OpenCvScript'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Rhetor.',
  description:
    'Rehearse a speech in front of an AI host that listens, watches, asks questions and gives spoken feedback.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // The intro script marks <html> before hydration, so React is told to expect it.
    <html lang="en" className={`${archivo.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        {/* Decides before first paint whether Home's intro plays, so its sheet is there from the first frame. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <OpenCvScript />
        {children}
      </body>
    </html>
  )
}
