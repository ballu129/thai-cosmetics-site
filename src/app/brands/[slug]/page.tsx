import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";

type BrandPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BrandPage({
  params,
}: BrandPageProps) {
  const { slug } = await params;

  const brand = await prisma.brand.findUnique({
    where: {
      slug,
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