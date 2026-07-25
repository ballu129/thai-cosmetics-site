"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import styles from "@/app/product/[slug]/ProductPage.module.css";

type ProductActionsProps = {
  slug: string;
  name: string;
  price: number;
  imageUrl?: string;
};

export default function ProductActions({
  slug,
  name,
  price,
  imageUrl,
}: ProductActionsProps) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  function handleAddToCart() {
    addToCart({
      slug,
      name,
      price,
      imageUrl,
    });

    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 1500);
  }

  return (
    <div className={styles.actions}>
      <button className={styles.buyButton}>
        Купить сейчас
      </button>

      <button
        className={styles.cartButton}
        onClick={handleAddToCart}
      >
        {added ? "Добавлено!" : "Добавить в корзину"}
      </button>

      <button className={styles.favoriteButton}>
        В избранное
      </button>
    </div>
  );
}
