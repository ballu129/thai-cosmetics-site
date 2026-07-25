"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { addToCart } = useCart();

  const [added, setAdded] = useState(false);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    const savedFavorites = JSON.parse(
      localStorage.getItem("favoriteProducts") ?? "[]",
    ) as string[];

    setFavorite(savedFavorites.includes(slug));
  }, [slug]);

  function addCurrentProductToCart() {
    addToCart({
      slug,
      name,
      price,
      imageUrl,
    });
  }

  function handleAddToCart() {
    addCurrentProductToCart();
    setAdded(true);

    window.setTimeout(() => {
      setAdded(false);
    }, 1500);
  }

  function handleBuyNow() {
    addCurrentProductToCart();
    router.push("/cart");
  }

  function handleFavorite() {
    const savedFavorites = JSON.parse(
      localStorage.getItem("favoriteProducts") ?? "[]",
    ) as string[];

    const updatedFavorites = favorite
      ? savedFavorites.filter((productSlug) => productSlug !== slug)
      : Array.from(new Set([...savedFavorites, slug]));

    localStorage.setItem(
      "favoriteProducts",
      JSON.stringify(updatedFavorites),
    );

    setFavorite(!favorite);
  }

  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.buyButton}
        onClick={handleBuyNow}
      >
        Купить сейчас
      </button>

      <button
        type="button"
        className={styles.cartButton}
        onClick={handleAddToCart}
      >
        {added ? "Добавлено!" : "Добавить в корзину"}
      </button>

      <button
        type="button"
        className={styles.favoriteButton}
        onClick={handleFavorite}
        aria-pressed={favorite}
      >
        {favorite ? "В избранном" : "В избранное"}
      </button>
    </div>
  );
}
