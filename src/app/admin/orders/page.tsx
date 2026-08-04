"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import OrdersTable from "./OrdersTable";
import styles from "./orders.module.css";

export default function AdminOrdersPage() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <Link href="/admin" className={styles.backLink}>
            ← В панель управления
          </Link>
          <h1 className={styles.title}>Заказы</h1>
          <p className={styles.subtitle}>
            Поиск, обработка и просмотр заказов покупателей.
          </p>
        </div>

        <button type="button" onClick={logout} className={styles.logoutButton}>
          Выйти
        </button>
      </div>

      <Suspense fallback={<p>Загрузка заказов…</p>}>
        <OrdersTable />
      </Suspense>
    </main>
  );
}
