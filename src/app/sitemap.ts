import type { MetadataRoute } from 'next';
import { products } from '@/data/products';
export default function sitemap():MetadataRoute.Sitemap{const base='https://example.com';const pages=['','/catalog','/healing-cosmetics','/brands','/about','/delivery','/contacts','/en'];return [...pages.map(url=>({url:base+url,lastModified:new Date()})),...products.map(p=>({url:`${base}/product/${p.slug}`,lastModified:new Date()}))]}
