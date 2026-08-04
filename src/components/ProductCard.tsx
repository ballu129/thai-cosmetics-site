import Image from "next/image";
import Link from "next/link";
import styles from "./ProductCard.module.css";

type ProductCardProduct = {
  slug: string;
  name: string;
  brand: string;
  category?: string;
  price: number;
  description?: string;
  healing?: boolean;
  imageUrl?: string;
};

function getSupportedImageUrl(imageUrl: string | undefined) {
  const value = imageUrl?.trim();

  if (!value) {
    return null;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com")
    ) {
      return value;
    }
  } catch {
    return null;
  }

  return null;
}

export default function ProductCard({
  product,
}: {
  product: ProductCardProduct;
}) {
  const imageUrl = getSupportedImageUrl(product.imageUrl);
  const productHref = `/product/${encodeURIComponent(product.slug)}`;

  return (
    <article className={styles.card}>
      <Link
        href={productHref}
        className={styles.imageLink}
        aria-label={`Открыть товар «${product.name}»`}
      >
        <div className={styles.image}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`Фото товара «${product.name}»`}
              fill
              sizes="(max-width: 620px) calc(100vw - 24px), (max-width: 860px) 50vw, (max-width: 1180px) 33vw, 25vw"
              className={styles.productImage}
            />
          ) : (
            <span className={styles.placeholder}>Изображение отсутствует</span>
          )}
        </div>
      </Link>

      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.brand}>{product.brand}</span>
          {product.healing ? (
            <span className={styles.healingBadge}>Лечебная косметика</span>
          ) : null}
        </div>

        <h3 className={styles.name}>
          <Link href={productHref}>{product.name}</Link>
        </h3>

        {product.category ? (
          <p className={styles.category}>{product.category}</p>
        ) : null}

        {product.description ? (
          <p className={styles.description}>{product.description}</p>
        ) : null}

        <div className={styles.row}>
          <strong className={styles.price}>
            {product.price.toLocaleString("ru-RU")} ₽
          </strong>
          <Link href={productHref} className={styles.detailsLink}>
            Подробнее
          </Link>
        </div>
      </div>
    </article>
  );
}
