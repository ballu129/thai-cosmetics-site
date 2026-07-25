import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductGallery from "@/components/ProductGallery";
import ProductActions from "@/components/ProductActions";
import styles from "./ProductPage.module.css";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: {
      slug,
    },
    include: {
      brand: true,
    },
  });

  if (!product) {
    notFound();
  }

  const images =
    product.slug === "herbal-balm-wang-prom"
      ? [
          "/products/wang-prom-1.jpg",
          "/products/wang-prom-2.jpg",
          "/products/wang-prom-3.jpg",
          "/products/wang-prom-4.jpg",
        ]
      : product.imageUrl
        ? [product.imageUrl]
        : [];

  return (
    <section className="container">
      <div className={styles.page}>
        <ProductGallery
          images={images}
          alt={product.name}
        />

        <div className={styles.info}>
          <span className={styles.brand}>
            {product.brand.name} · {product.category}
          </span>

          <h1 className={styles.title}>
            {product.name}
          </h1>

          <p className={styles.description}>
            {product.description}
          </p>

          <div className={styles.ratingRow}>
            <span className={styles.rating}>
              ⭐⭐⭐⭐⭐ 4.9 (126 отзывов)
            </span>

            <span className={styles.stock}>
              ✔ В наличии
            </span>
          </div>

          <div className={styles.price}>
            {Number(product.price).toLocaleString(
              "ru-RU"
            )}{" "}
            ₽
          </div>

          <ProductActions
            slug={product.slug}
            name={product.name}
            price={Number(product.price)}
            imageUrl={images[0]}
          />

          <div className={styles.details}>
            <h2>Характеристики</h2>

            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>
                  Бренд
                </span>

                <span className={styles.detailValue}>
                  {product.brand.name}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>
                  Страна
                </span>

                <span className={styles.detailValue}>
                  Таиланд
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>
                  Категория
                </span>

                <span className={styles.detailValue}>
                  {product.category}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>
                  Вес
                </span>

                <span className={styles.detailValue}>
                  50 г
                </span>
              </div>
            </div>
          </div>

          <div className={styles.benefits}>
            <div className={styles.benefit}>
              <strong>🇹🇭 Оригинальный товар</strong>
              <span>
                Поставка напрямую из Таиланда.
              </span>
            </div>

            <div className={styles.benefit}>
              <strong>🚚 Быстрая доставка</strong>
              <span>
                По России и странам СНГ.
              </span>
            </div>

            <div className={styles.benefit}>
              <strong>✔ Проверенное качество</strong>
              <span>
                Только сертифицированная продукция.
              </span>
            </div>

            <div className={styles.benefit}>
              <strong>📦 В наличии</strong>
              <span>
                Товар готов к отправке.
              </span>
            </div>
          </div>

          <div className={styles.ingredients}>
            <h2>Активные ингредиенты</h2>

            <ul>
              {product.activeIngredients.map(
                (ingredient) => (
                  <li key={ingredient}>
                    {ingredient}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}