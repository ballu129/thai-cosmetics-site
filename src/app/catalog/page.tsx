import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";
import styles from "./Catalog.module.css";

export const metadata: Metadata = {
  title: "Каталог тайской косметики",
  description:
    "Каталог оригинальной тайской косметики для ухода за кожей, волосами и телом.",
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
    <section className={styles.catalog}>
      <div className={styles.heading}>
        <span className={styles.eyebrow}>
          Более 2000 товаров
        </span>

        <h1 className={styles.title}>
          Каталог тайской косметики
        </h1>

        <p className={styles.description}>
          Поиск по названию товара, бренду и категории.
        </p>
      </div>

      <form
        action="/catalog"
        method="get"
        className={styles.searchForm}
      >
        <input
          className={styles.searchInput}
          type="search"
          name="search"
          defaultValue={query}
          placeholder="Например: бальзам, Wang Prom или уход за лицом"
          aria-label="Поиск товаров"
        />

        <button
          className={styles.searchButton}
          type="submit"
        >
          Найти
        </button>
      </form>

      {query && (
        <div className={styles.searchResult}>
          Результаты поиска по запросу: <strong>«{query}»</strong>
        </div>
      )}

      {products.length > 0 ? (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard
              key={product.slug}
              product={product}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <h2>Товары не найдены</h2>
          <p>
            Попробуйте изменить запрос или очистить поле поиска.
          </p>

          <a href="/catalog">
            Показать все товары
          </a>
        </div>
      )}
    </section>
  );
}
