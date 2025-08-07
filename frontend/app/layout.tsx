import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fresh Basket',
  description: 'Created with Next JS',
  generator: 'Asaan AI',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
