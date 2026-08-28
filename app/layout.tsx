import type { Metadata, Viewport } from 'next'
import { Anton, Inter } from 'next/font/google'
import { ChatAsistente } from '@/components/ChatAsistente'
import { CartProvider } from '@/lib/cart-context'
import './globals.css'

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// En Vercel se resuelve solo con VERCEL_URL; en local cae a localhost.
const urlSitio = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(urlSitio),
  title: 'Street Fries — Pide en línea',
  description:
    'Made on the Street — Thinking big. Arma tu pedido de Street Fries y envíalo por WhatsApp en un toque.',
  openGraph: {
    title: 'Street Fries — Pide en línea',
    description: 'Made on the Street — Thinking big.',
    images: ['/images/fries-broadway.jpg'],
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#0B0B0B',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${anton.variable} ${inter.variable}`}>
      <body className="font-sans">
        <CartProvider>
          {children}
          <ChatAsistente />
        </CartProvider>
      </body>
    </html>
  )
}
