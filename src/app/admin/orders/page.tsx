"use client";

import { useRouter } from "next/navigation";
import OrdersTable from "./OrdersTable";

export default function AdminOrdersPage() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    router.push("/admin/login");
    router.refresh();
  }

  return (
    <main style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1>Заказы</h1>

        <button onClick={logout}>
          Выйти
        </button>
      </div>

      <OrdersTable />
    </main>
  );
}
