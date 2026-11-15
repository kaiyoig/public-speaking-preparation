import OpenCvScript from './components/OpenCvScript'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <OpenCvScript />
        {children}
      </body>
    </html>
  )
}
