import Link from "next/link";
import { notFound } from "next/navigation";
import { hashOrderAccessToken } from "@/lib/order-access";
import { prisma } from "@/lib/prisma";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

type GuestOrderPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    token?: string;
  }>;
};

const statusNames = {
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

export default async function GuestOrderPage({
  params,
  searchParams,
}: GuestOrderPageProps) {
  const { id } = await params;
  const { token = "" } = await searchParams;
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    notFound();
  }

  const order = await prisma.order.findFirst({
    where: {
      id,
      userId: null,
      guestAccessTokenHash: hashOrderAccessToken(normalizedToken),
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    notFound();
  }

  const deliveryFields = [
    {
      label: "Получатель",
      value: order.customerName,
    },
    {
      label: "Город",
      value: order.city,
    },
    {
      label: "Адрес доставки",
      value: order.address,
    },
    {
      label: "Комментарий",
      value: order.customerComment,
    },
  ].filter((field) => field.value?.trim());

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          header,
          footer,
          nav,
          .order-actions {
            display: none !important;
          }

          html,
          body {
            background: white !important;
          }

          body {
            margin: 0 !important;
          }

          .order-print-page {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            color: black !important;
            font-size: 12pt !important;
          }

          .order-section,
          .order-item,
          .order-total {
            break-inside: avoid;
          }
        }
      `}</style>

      <main
        className="order-print-page"
        style={{
          maxWidth: 1000,
          margin: "40px auto",
          padding: 24,
        }}
      >
        <div
          className="order-actions"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <Link href="/catalog">
            ← Вернуться в каталог
          </Link>

          <PrintButton />
        </div>

        <article
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 24,
            background: "#ffffff",
          }}
        >
          <h1 style={{ margin: "0 0 20px" }}>
            Заказ № {order.id}
          </h1>

          <div className="order-section" style={{ marginBottom: 24 }}>
            <p>
              <strong>Дата:</strong>{" "}
              {order.createdAt.toLocaleString("ru-RU")}
            </p>

            <p>
              <strong>Статус:</strong>{" "}
              {statusNames[order.status]}
            </p>

            <p>
              <strong>Итого:</strong>{" "}
              {formatCurrency(order.totalAmount)}
            </p>
          </div>

          <section className="order-section" style={{ marginBottom: 32 }}>
            <h2>Состав заказа</h2>

            {order.items.map((item) => (
              <div
                className="order-item"
                key={item.id}
                style={{
                  borderBottom: "1px solid #ddd",
                  padding: "12px 0",
                }}
              >
                <strong>{item.productName}</strong>

                <div>
                  Количество: {item.quantity}
                </div>

                <div>
                  Цена: {formatCurrency(item.unitPrice)}
                </div>

                <div>
                  Итого: {formatCurrency(item.lineTotal)}
                </div>
              </div>
            ))}
          </section>

          {deliveryFields.length > 0 ? (
            <section className="order-section" style={{ marginBottom: 32 }}>
              <h2>Доставка</h2>

              {deliveryFields.map((field) => (
                <p key={field.label}>
                  <strong>{field.label}:</strong> {field.value}
                </p>
              ))}
            </section>
          ) : null}

          <h2 className="order-total">
            Общая сумма: {formatCurrency(order.totalAmount)}
          </h2>
        </article>
      </main>
    </>
  );
}
