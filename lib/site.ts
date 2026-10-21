/** URL pública del sitio, usada por metadata, robots.ts y sitemap.ts.
 *  Prioridad: dominio propio (NEXT_PUBLIC_SITE_URL) > URL interna de Vercel > localhost.
 *  Sin NEXT_PUBLIC_SITE_URL en producción, Open Graph y el sitemap apuntan al
 *  subdominio *.vercel.app en vez del dominio real. */
export const URL_SITIO = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
