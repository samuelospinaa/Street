import type { MetadataRoute } from 'next'
import { URL_SITIO } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: URL_SITIO, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${URL_SITIO}/pedido`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ]
}
