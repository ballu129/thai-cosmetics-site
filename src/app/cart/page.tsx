"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import styles from "./CartPage.module.css";

export default function CartPage() {
  const {
    items,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (items.length === 0) {
    return (
      <section className={styles.page}>
        <h1>{"\u041A\u043E\u0440\u0437\u0438\u043D\u0430"}</h1>

        <div className={styles.empty}>
          <p>{"\u0412\u0430\u0448\u0430 \u043A\u043E\u0440\u0437\u0438\u043D\u0430 \u043F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u0430."}</p>

          <Link href="/catalog" className={styles.backButton}>
            {"\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433"}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <h1>{"\u041A\u043E\u0440\u0437\u0438\u043D\u0430"}</h1>

      <div className={styles.list}>
        {items.map((item) => (
          <article key={item.slug} className={styles.card}>
            <div className={styles.image}>
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="120px"
                  style={{ objectFit: "contain" }}
                />
              )}
            </div>

            <div className={styles.info}>
              <h2>{item.name}</h2>
              <p>{item.price.toLocaleString("ru-RU")} {"\u20BD"}</p>
            </div>

            <div className={styles.controls}>
              <button onClick={() => decreaseQuantity(item.slug)}>
                {"\u2212"}
              </button>
              <span>{item.quantity}</span>
              <button onClick={() => increaseQuantity(item.slug)}>+</button>
            </div>

            <div className={styles.sum}>
              {(item.price * item.quantity).toLocaleString("ru-RU")} {"\u20BD"}
            </div>

            <button
              className={styles.remove}
              onClick={() => removeFromCart(item.slug)}
            >
              {"\u0423\u0434\u0430\u043B\u0438\u0442\u044C"}
            </button>
          </article>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.total}>
          {"\u0418\u0442\u043E\u0433\u043E: "}
          <strong>{total.toLocaleString("ru-RU")} {"\u20BD"}</strong>
        </div>

        <div className={styles.actions}>
          <button className={styles.clear} onClick={clearCart}>
            {"\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u043A\u043E\u0440\u0437\u0438\u043D\u0443"}
          </button>

          <Link href="/checkout" className={styles.checkout}>
            {"\u041E\u0444\u043E\u0440\u043C\u0438\u0442\u044C \u0437\u0430\u043A\u0430\u0437"}
          </Link>
        </div>
      </div>
    </section>
  );
}