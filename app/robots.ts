import type { MetadataRoute } from 'next'
import { URL_SITIO } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${URL_SITIO}/sitemap.xml`,
  }
}
