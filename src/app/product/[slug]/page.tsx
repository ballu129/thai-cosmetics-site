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

  const images = product.imageUrl
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
              ★★★★★ 4.9 (126 отзывов)
            </span>

            <span className={styles.stock}>
              ✓ В наличии
            </span>
          </div>

          <div className={styles.price}>
            {Number(product.price).toLocaleString("ru-RU")} ₽
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
                  Страна производства
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
                  Объём
                </span>

                <span className={styles.detailValue}>
                  50 мл
                </span>
              </div>
            </div>
          </div>

          <div className={styles.benefits}>
            <div className={styles.benefit}>
              <strong>Оригинальная продукция</strong>
              <span>
                Прямая поставка от проверенных поставщиков из Таиланда.
              </span>
            </div>

            <div className={styles.benefit}>
              <strong>Контроль качества</strong>
              <span>
                Проверяем товар перед отправкой покупателю.
              </span>
            </div>

            <div className={styles.benefit}>
              <strong>Безопасная оплата</strong>
              <span>
                Надёжные способы оплаты и защита заказа.
              </span>
            </div>

            <div className={styles.benefit}>
              <strong>Доставка по России и СНГ</strong>
              <span>
                Отправляем заказы напрямую из Таиланда.
              </span>
            </div>
          </div>

          {product.activeIngredients.length > 0 && (
            <div className={styles.ingredients}>
              <h2>Активные компоненты</h2>

              <ul>
                {product.activeIngredients.map((ingredient) => (
                  <li key={ingredient}>
                    {ingredient}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
