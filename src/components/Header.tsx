"use client";

import Link from "next/link";

import { useCart } from "@/components/CartProvider";
import styles from "./Header.module.css";

export default function Header() {
  const { items } = useCart();

  const totalItems = items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        Доставка оригинальной тайской косметики из Таиланда в Россию и СНГ
      </div>

      <div className={styles.navbar}>
        <Link className={styles.logo} href="/">
          SIAM CARE
        </Link>

        <nav className={styles.nav}>
          <Link href="/catalog">Каталог</Link>
          <Link href="/healing-cosmetics">Лечебная косметика</Link>
          <Link href="/brands">Бренды</Link>
          <Link href="/delivery">Доставка</Link>
          <Link href="/about">О компании</Link>
        </nav>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Link className={styles.account} href="/login">
            Войти
          </Link>

          <Link className={styles.account} href="/cart">
            🛒 Корзина ({totalItems})
          </Link>
        </div>
      </div>
    </header>
  );
}