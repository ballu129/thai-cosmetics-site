"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import { useCart } from "@/components/CartProvider";
import styles from "./Header.module.css";

export default function Header() {
  const { items } = useCart();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

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
          <Link href="/wholesale">Оптовым клиентам</Link>
          <Link href="/delivery">Доставка</Link>
          <Link href="/about">О компании</Link>
        </nav>

        <div className={styles.actions}>
          <Link
            className={`${styles.account} ${styles.mobileWholesale}`}
            href="/wholesale"
          >
            Оптовым клиентам
          </Link>
          {isAuthenticated ? (
            <>
              <Link className={styles.account} href="/account">
                Личный кабинет
              </Link>

              <button
                className={styles.account}
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                style={{
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Выйти
              </button>
            </>
          ) : (
            <Link className={styles.account} href="/login">
              Войти
            </Link>
          )}

          <Link className={styles.account} href="/cart">
            🛒 Корзина ({totalItems})
          </Link>
        </div>
      </div>
    </header>
  );
}
