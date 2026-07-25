import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintButton from "./PrintButton";

const statusNames = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  PROCESSING: "В обработке",
  SHIPPED: "Отправлен",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
} as const;

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  if (!order) {
    notFound();
  }

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

          .order-print-page h1 {
            margin: 0 0 14px !important;
            font-size: 24pt !important;
          }

          .order-print-page h2 {
            margin: 16px 0 10px !important;
            font-size: 16pt !important;
          }

          .order-print-page p {
            margin: 6px 0 !important;
          }

          .order-section {
            margin-bottom: 18px !important;
            break-inside: avoid;
          }

          .order-item {
            padding: 8px 0 !important;
            break-inside: avoid;
          }

          .order-total {
            margin-top: 16px !important;
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
          <Link href="/admin/orders">
            ← Назад к заказам
          </Link>

          <PrintButton />
        </div>

        <h1>Заказ</h1>

        <div className="order-section" style={{ marginBottom: 24 }}>
          <p>
            <strong>ID:</strong> {order.id}
          </p>

          <p>
            <strong>Дата:</strong>{" "}
            {order.createdAt.toLocaleString("ru-RU")}
          </p>

          <p>
            <strong>Статус:</strong>{" "}
            {statusNames[order.status]}
          </p>
        </div>

        <section className="order-section" style={{ marginBottom: 32 }}>
          <h2>Клиент</h2>

          <p>
            <strong>Имя:</strong> {order.customerName}
          </p>

          <p>
            <strong>Телефон:</strong>{" "}
            <a href={`tel:${order.phone}`}>
              {order.phone}
            </a>
          </p>

          <p>
            <strong>Email:</strong>{" "}
            <a href={`mailto:${order.email}`}>
              {order.email}
            </a>
          </p>

          <p>
            <strong>Адрес:</strong> {order.address}
          </p>
        </section>

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
                {item.quantity} шт. ×{" "}
                {Number(item.unitPrice).toFixed(2)}
              </div>

              <div>
                Итого:{" "}
                {Number(item.lineTotal).toFixed(2)}
              </div>
            </div>
          ))}
        </section>

        <h2 className="order-total">
          Общая сумма:{" "}
          {Number(order.totalAmount).toFixed(2)}
        </h2>
      </main>
    </>
  );
}
