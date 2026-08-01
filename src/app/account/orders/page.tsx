import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    select: {
      id: true,
      customerName: true,
      phone: true,
      email: true,
      address: true,
      totalAmount: true,
      status: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
        },
      },
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
          <div
            style={{
              marginTop: "24px",
              padding: "32px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              background: "#ffffff",
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: "24px",
              }}
            >
              У вас пока нет заказов
            </h2>

            <p
              style={{
                margin: "0 0 24px",
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              Выберите товары в каталоге и оформите первый заказ.
            </p>

            <Link
              href="/catalog"
              style={{
                display: "inline-block",
                padding: "12px 18px",
                borderRadius: "8px",
                background: "#254b3f",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Перейти в каталог
            </Link>
          </div>
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
              const orderDate = order.createdAt.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              });

              return (
                <article
                  key={order.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "24px",
                    background: "#ffffff",
                    boxShadow: "0 4px 18px rgba(15, 23, 42, 0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "20px",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          marginTop: 0,
                          marginBottom: "12px",
                        }}
                      >
                        Заказ № {order.id}
                      </h2>

                      <p>
                        Дата оформления: {orderDate}
                      </p>

                      <p>
                        Статус: {status}
                      </p>

                      <p>
                        Общая сумма:{" "}
                        {Number(order.totalAmount).toLocaleString("ru-RU")} ₽
                      </p>
                    </div>

                    <Link
                      href={`/account/orders/${order.id}`}
                      style={{
                        display: "inline-block",
                        padding: "10px 16px",
                        border: "1px solid #254b3f",
                        borderRadius: "8px",
                        color: "#254b3f",
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      Подробнее
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
