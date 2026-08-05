import type { MetadataRoute } from "next";
import { products } from "@/data/products";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://thai-cosmetics-site.vercel.app";
  const pages = [
    "",
    "/catalog",
    "/healing-cosmetics",
    "/brands",
    "/wholesale",
    "/about",
    "/delivery",
    "/contacts",
    "/en",
  ];

  return [
    ...pages.map((url) => ({ url: base + url, lastModified: new Date() })),
    ...products.map((product) => ({
      url: `${base}/product/${product.slug}`,
      lastModified: new Date(),
    })),
  ];
}
