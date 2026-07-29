import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

function formatCurrency(value: unknown) {
  return `${Number(value).toLocaleString("ru-RU")} ₽`;
}

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
  const orderDate = order.createdAt.toLocaleString("ru-RU");
  const deliveryFields = [
    {
      label: "Получатель",
      value: order.customerName,
    },
    {
      label: "Телефон",
      value: order.phone,
    },
    {
      label: "Email",
      value: order.email,
    },
    {
      label: "Страна",
      value: order.country,
    },
    {
      label: "Город",
      value: order.city,
    },
    {
      label: "Адрес",
      value: order.address,
    },
  ].filter((field) => field.value.trim().length > 0);

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
              margin: "0 0 20px",
            }}
          >
            Заказ № {order.id}
          </h1>

          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              margin: 0,
            }}
          >
            <div>
              <dt
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                  marginBottom: "6px",
                }}
              >
                Дата
              </dt>
              <dd
                style={{
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                {orderDate}
              </dd>
            </div>

            <div>
              <dt
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                  marginBottom: "6px",
                }}
              >
                Статус
              </dt>
              <dd
                style={{
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                {status}
              </dd>
            </div>

            <div>
              <dt
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                  marginBottom: "6px",
                }}
              >
                Итоговая стоимость
              </dt>
              <dd
                style={{
                  margin: 0,
                  fontWeight: 700,
                }}
              >
                {formatCurrency(order.totalAmount)}
              </dd>
            </div>
          </dl>

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

                <dl
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "12px",
                    margin: 0,
                  }}
                >
                  <div>
                    <dt
                      style={{
                        color: "#64748b",
                        fontSize: "14px",
                      }}
                    >
                      Количество
                    </dt>
                    <dd
                      style={{
                        margin: "6px 0 0",
                      }}
                    >
                      {item.quantity}
                    </dd>
                  </div>

                  <div>
                    <dt
                      style={{
                        color: "#64748b",
                        fontSize: "14px",
                      }}
                    >
                      Цена за единицу
                    </dt>
                    <dd
                      style={{
                        margin: "6px 0 0",
                      }}
                    >
                      {formatCurrency(item.unitPrice)}
                    </dd>
                  </div>

                  <div>
                    <dt
                      style={{
                        color: "#64748b",
                        fontSize: "14px",
                      }}
                    >
                      Итого
                    </dt>
                    <dd
                      style={{
                        margin: "6px 0 0",
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(item.lineTotal)}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          {deliveryFields.length > 0 ? (
            <>
              <hr
                style={{
                  margin: "28px 0",
                  border: 0,
                  borderTop: "1px solid #e2e8f0",
                }}
              />

              <h2>Доставка</h2>

              <dl
                style={{
                  display: "grid",
                  gap: "12px",
                  margin: 0,
                }}
              >
                {deliveryFields.map((field) => (
                  <div key={field.label}>
                    <dt
                      style={{
                        color: "#64748b",
                        fontSize: "14px",
                        marginBottom: "4px",
                      }}
                    >
                      {field.label}
                    </dt>
                    <dd
                      style={{
                        margin: 0,
                      }}
                    >
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          ) : null}
        </article>
      </section>
    </main>
  );
}
