import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Каталог тайской косметики",
  description:
    "Каталог оригинальной сертифицированной косметики из Таиланда.",
};

type CatalogProps = {
  searchParams: Promise<{
    search?: string;
  }>;
};

export default async function Catalog({
  searchParams,
}: CatalogProps) {
  const { search } = await searchParams;
  const query = search?.trim() ?? "";

  const productsFromDb = await prisma.product.findMany({
    where: query
      ? {
          OR: [
            {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              category: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              brand: {
                name: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : undefined,
    include: {
      brand: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const products = productsFromDb.map((product) => ({
    slug: product.slug,
    name: product.name,
    brand: product.brand.name,
    category: product.category,
    price: Number(product.price),
    description: product.description,
    imageUrl: product.imageUrl ?? undefined,
    healing: product.healing,
    activeIngredients: product.activeIngredients,
  }));

  return (
    <section className="container">
      <span className="eyebrow">Более 2000 товаров</span>

      <h1 className="pageTitle">Каталог тайской косметики</h1>

      <p className="lead">
        Поиск по названию товара, бренду и категории.
      </p>

      <form action="/catalog" method="get">
        <input
          type="search"
          name="search"
          defaultValue={query}
          placeholder="Например: бальзам, Wang Prom или уход за лицом"
          aria-label="Поиск товаров"
        />

        <button type="submit">Найти</button>
      </form>

      {products.length > 0 ? (
        <div className="grid">
          {products.map((product) => (
            <ProductCard
              key={product.slug}
              product={product}
            />
          ))}
        </div>
      ) : (
        <p className="lead">
          По вашему запросу товары не найдены.
        </p>
      )}
    </section>
  );
}
