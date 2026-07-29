import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type BrandPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function decodeSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export default async function BrandPage({
  params,
}: BrandPageProps) {
  const { slug } = await params;
  const decodedSlug = decodeSlug(slug);

  const brand = await prisma.brand.findUnique({
    where: {
      slug: decodedSlug,
    },
    include: {
      products: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!brand) {
    notFound();
  }

  const products = brand.products.map((product) => ({
    slug: product.slug,
    name: product.name,
    brand: brand.name,
    category: product.category,
    price: Number(product.price),
    description: product.description,
    healing: product.healing,
    activeIngredients: product.activeIngredients,
  }));

  return (
    <section className="container">
      <span className="eyebrow">Бренд из Таиланда</span>

      <h1 className="pageTitle">{brand.name}</h1>

      {brand.description && (
        <p className="lead">{brand.description}</p>
      )}

      <div className="grid">
        {products.map((product) => (
          <ProductCard
            key={product.slug}
            product={product}
          />
        ))}
      </div>
    </section>
  );
}
