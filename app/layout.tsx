import type { Metadata, Viewport } from 'next'
import { Anton, Inter } from 'next/font/google'
import { ChatAsistente } from '@/components/ChatAsistente'
import { CartProvider } from '@/lib/cart-context'
import { URL_SITIO } from '@/lib/site'
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

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  title: 'Street Fries | Papas Artesanales a Domicilio en Sabaneta, Envigado y Florida',
  description:
    'Pide papas artesanales con preparaciones gourmet a domicilio en Sabaneta, Envigado, Florida y el sur del Valle de Aburrá. 6 sedes, pedido en línea, confirmación por WhatsApp.',
  keywords: [
    'papas a domicilio Sabaneta',
    'papas artesanales Envigado',
    'papas gourmet Medellín',
    'salchipapas gourmet',
    'papas con preparaciones',
    'Tostón de Queso Street Fries',
  ],
  openGraph: {
    title: 'Street Fries | Papas Artesanales a Domicilio',
    description:
      'Made on the Street — Thinking big. Papas gourmet con 6 sedes en el sur del Valle de Aburrá.',
    images: ['/images/fries-broadway.jpg'],
    type: 'website',
    locale: 'es_CO',
  },
  alternates: { canonical: URL_SITIO },
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
