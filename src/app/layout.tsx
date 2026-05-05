import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SCAR',
  description: 'Your power destroys you.',
  openGraph: {
    title: 'SCAR',
    description: 'Your power destroys you.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black min-h-screen overflow-hidden">
        {children}
      </body>
    </html>
  )
}
