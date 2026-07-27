import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type OrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const statusLabels = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  PROCESSING: "В обработке",
  SHIPPED: "Отправлен",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
} as const;

export const metadata = {
  title: "Информация о заказе",
};

export default async function OrderPage({ params }: OrderPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/orders");
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    notFound();
  }

  const status =
    statusLabels[order.status as keyof typeof statusLabels] ?? order.status;

  return (
    <main className="container">
      <section
        style={{
          maxWidth: "1100px",
          margin: "48px auto",
        }}
      >
        <Link
          href="/account/orders"
          style={{
            display: "inline-block",
            marginBottom: "24px",
          }}
        >
          ← Вернуться к заказам
        </Link>

        <article
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "24px",
            background: "#ffffff",
          }}
        >
          <h1
            style={{
              marginTop: 0,
            }}
          >
            Заказ № {order.id}
          </h1>

          <p>
            <strong>Дата:</strong>{" "}
            {order.createdAt.toLocaleString("ru-RU")}
          </p>

          <p>
            <strong>Статус:</strong> {status}
          </p>

          <p>
            <strong>Сумма:</strong>{" "}
            {Number(order.totalAmount).toLocaleString("ru-RU")} ₽
          </p>

          <hr
            style={{
              margin: "28px 0",
              border: 0,
              borderTop: "1px solid #e2e8f0",
            }}
          />

          <h2>Товары</h2>

          <div
            style={{
              display: "grid",
              gap: "16px",
              marginTop: "16px",
            }}
          >
            {order.items.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "16px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "10px",
                  }}
                >
                  {item.productName}
                </h3>

                <p>Количество: {item.quantity}</p>

                <p>
                  Цена за единицу:{" "}
                  {Number(item.unitPrice).toLocaleString("ru-RU")} ₽
                </p>

                <p>
                  Итого:{" "}
                  {Number(item.lineTotal).toLocaleString("ru-RU")} ₽
                </p>
              </div>
            ))}
          </div>

          <hr
            style={{
              margin: "28px 0",
              border: 0,
              borderTop: "1px solid #e2e8f0",
            }}
          />

          <h2>Доставка</h2>

          <p>
            <strong>Получатель:</strong> {order.customerName}
          </p>

          <p>
            <strong>Телефон:</strong> {order.phone}
          </p>

          <p>
            <strong>Email:</strong> {order.email}
          </p>

          <p>
            <strong>Адрес:</strong> {order.address}
          </p>
        </article>
      </section>
    </main>
  );
}
