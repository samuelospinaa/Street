/** @type {import('next').NextConfig} */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname
  } catch {
    return null
  }
})()

const nextConfig = {
  images: {
    remotePatterns: [
      // Las fotos de producto viven en Supabase Storage (bucket público `menu-images`).
      ...(supabaseHost
        ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
        : []),
      // Fallback: permite cualquier proyecto Supabase si la variable no está definida en build time.
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  // Cabeceras de seguridad de base. No se incluye Content-Security-Policy acá
  // porque requiere mapear cada script/estilo externo que use la app (Tailwind
  // en runtime, fuentes, etc.) y probarlo a fondo antes de activarlo — un CSP
  // mal calibrado rompe la página en silencio.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Geolocalización sí se usa (botón "Compartir mi ubicación" en /pedido);
          // el resto de APIs sensibles del navegador no hacen falta acá.
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

export default nextConfig
