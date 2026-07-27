import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const statusLabels = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  PROCESSING: "В обработке",
  SHIPPED: "Отправлен",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
} as const;

export const metadata = {
  title: "Мои заказы",
};

export default async function OrdersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/orders");
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="container">
      <section
        style={{
          maxWidth: "1100px",
          margin: "48px auto",
        }}
      >
        <h1>Мои заказы</h1>

        {orders.length === 0 ? (
          <p
            style={{
              marginTop: "16px",
              color: "#64748b",
            }}
          >
            У вас пока нет заказов.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "20px",
              marginTop: "24px",
            }}
          >
            {orders.map((order) => {
              const status =
                statusLabels[
                  order.status as keyof typeof statusLabels
                ] ?? order.status;

              return (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <article
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "16px",
                      padding: "24px",
                      background: "#ffffff",
                      boxShadow: "0 4px 18px rgba(15, 23, 42, 0.05)",
                    }}
                  >
                    <h2
                      style={{
                        marginTop: 0,
                        marginBottom: "16px",
                      }}
                    >
                      Заказ № {order.id}
                    </h2>

                    <p>
                      Статус: {status}
                    </p>

                    <p>
                      Сумма:{" "}
                      {Number(order.totalAmount).toLocaleString("ru-RU")} ₽
                    </p>

                    <p>
                      Позиций в заказе: {order.items.length}
                    </p>

                    <p
                      style={{
                        marginBottom: 0,
                        marginTop: "20px",
                        fontWeight: 600,
                      }}
                    >
                      Открыть заказ →
                    </p>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
