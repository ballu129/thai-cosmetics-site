import Image from "next/image";
import Link from "next/link";
import styles from "./ProductCard.module.css";

type ProductCardProduct = {
  slug: string;
  name: string;
  brand: string;
  price: number;
  description: string;
  healing?: boolean;
  imageUrl?: string;
};

export default function ProductCard({
  product,
}: {
  product: ProductCardProduct;
}) {
  return (
    <article className={styles.card}>
      <div className={styles.image}>
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            style={{ objectFit: "contain", padding: "12px" }}
          />
        ) : (
          <span>
            {product.healing
              ? "Лечебная косметика"
              : "Тайская косметика"}
          </span>
        )}
      </div>

      <div className={styles.body}>
        <span>{product.brand}</span>

        <h3>{product.name}</h3>

        <p>{product.description}</p>

        <div className={styles.row}>
          <strong>
            {product.price.toLocaleString("ru-RU")} ₽
          </strong>

          <Link href={`/product/${product.slug}`}>
            Подробнее
          </Link>
        </div>
      </div>
    </article>
  );
}