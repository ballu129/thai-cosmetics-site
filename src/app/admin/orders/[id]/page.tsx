import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type {
  DeliveryMethod,
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import PrintButton from "./PrintButton";
import styles from "./order-details.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Заказ",
};

const statusNames: Record<OrderStatus, string> = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  PROCESSING: "В обработке",
  SHIPPED: "Отправлен",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

const statusClasses: Record<OrderStatus, string> = {
  NEW: styles.statusNew,
  CONFIRMED: styles.statusConfirmed,
  PROCESSING: styles.statusProcessing,
  SHIPPED: styles.statusShipped,
  COMPLETED: styles.statusCompleted,
  CANCELLED: styles.statusCancelled,
};

const paymentMethodNames: Record<PaymentMethod, string> = {
  PAYMENT_ON_DELIVERY: "При получении",
  BANK_CARD: "Банковская карта",
  SBP: "СБП",
  CRYPTO: "Криптовалюта",
};

const paymentStatusNames: Record<PaymentStatus, string> = {
  NOT_REQUIRED: "Оплата не требуется",
  PENDING: "Ожидает оплаты",
  PAID: "Оплачен",
  FAILED: "Ошибка оплаты",
  REFUNDED: "Возвращён",
};

const deliveryMethodNames: Record<DeliveryMethod, string> = {
  CDEK_COURIER: "Курьер CDEK",
  CDEK_PICKUP: "Пункт выдачи CDEK",
  OTHER: "Другой способ",
};

const deliveryStatusNames: Record<DeliveryStatus, string> = {
  NOT_READY: "Не подготовлен",
  PREPARING: "Готовится к отправке",
  HANDED_TO_CARRIER: "Передан перевозчику",
  IN_TRANSIT: "В пути",
  READY_FOR_PICKUP: "Готов к выдаче",
  DELIVERED: "Доставлен",
  CANCELLED: "Доставка отменена",
};

const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
});

function getText(value: string | null | undefined) {
  return value?.trim() || "Не указан";
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id.trim()) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      customerName: true,
      phone: true,
      email: true,
      country: true,
      city: true,
      address: true,
      postalCode: true,
      totalAmount: true,
      deliveryCost: true,
      customerComment: true,
      trackingNumber: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      deliveryMethod: true,
      deliveryStatus: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      items: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });

  if (!order) {
    notFound();
  }

  const phone = order.phone.trim();
  const email = order.email.trim();
  const hasAddressData = [
    order.address,
    order.city,
    order.postalCode,
    order.country,
  ].some((value) => Boolean(value?.trim()));
  const itemsTotal = order.items.reduce(
    (total, item) => total + Number(item.lineTotal),
    0,
  );
  const accountName = order.user
    ? getText(order.user.name || order.user.email)
    : "Гостевой заказ";

  return (
    <main className={styles.page}>
      <div className={`${styles.topActions} ${styles.screenOnly}`}>
        <Link href="/admin/orders" className={styles.backLink}>
          ← Назад к заказам
        </Link>
        <PrintButton className={styles.printButton} />
      </div>

      <section className={styles.orderHeader} aria-labelledby="order-title">
        <div className={styles.headingGroup}>
          <p className={styles.eyebrow}>Административная карточка</p>
          <h1 id="order-title" className={styles.title}>Заказ</h1>
          <p className={styles.orderId} title={order.id}>
            {order.id}
          </p>
        </div>

        <div className={styles.headerMeta}>
          <span className={`${styles.statusBadge} ${statusClasses[order.status]}`}>
            {statusNames[order.status]}
          </span>
          <time dateTime={order.createdAt.toISOString()}>
            {dateFormatter.format(order.createdAt)}
          </time>
        </div>
      </section>

      <section className={styles.statusPanel} aria-labelledby="status-heading">
        <div>
          <p className={styles.sectionEyebrow}>Текущий статус</p>
          <h2 id="status-heading" className={styles.statusTitle}>
            {statusNames[order.status]}
          </h2>
        </div>
        <p className={`${styles.statusHint} ${styles.screenOnly}`}>
          Изменение статуса доступно в списке заказов.
        </p>
      </section>

      <div className={styles.detailsGrid}>
        <section className={styles.card} aria-labelledby="customer-heading">
          <h2 id="customer-heading" className={styles.sectionTitle}>
            Клиент
          </h2>
          <dl className={styles.detailsList}>
            <div>
              <dt>Имя</dt>
              <dd>{getText(order.customerName)}</dd>
            </div>
            <div>
              <dt>Тип пользователя</dt>
              <dd>{order.user ? "Зарегистрированный пользователь" : "Гость"}</dd>
            </div>
            <div>
              <dt>Телефон</dt>
              <dd>
                {phone ? <a href={`tel:${phone}`}>{phone}</a> : "Не указан"}
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                {email ? <a href={`mailto:${email}`}>{email}</a> : "Не указан"}
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.card} aria-labelledby="delivery-heading">
          <h2 id="delivery-heading" className={styles.sectionTitle}>
            Доставка
          </h2>
          {hasAddressData ? (
            <dl className={styles.detailsList}>
              <div>
                <dt>Адрес</dt>
                <dd className={styles.preWrap}>{getText(order.address)}</dd>
              </div>
              <div>
                <dt>Город</dt>
                <dd>{getText(order.city)}</dd>
              </div>
              <div>
                <dt>Индекс</dt>
                <dd>{getText(order.postalCode)}</dd>
              </div>
              <div>
                <dt>Страна</dt>
                <dd>{getText(order.country)}</dd>
              </div>
            </dl>
          ) : (
            <p className={styles.emptyText}>Данные доставки не указаны.</p>
          )}

          <dl className={`${styles.detailsList} ${styles.deliveryMeta}`}>
            <div>
              <dt>Способ</dt>
              <dd>{deliveryMethodNames[order.deliveryMethod]}</dd>
            </div>
            <div>
              <dt>Статус доставки</dt>
              <dd>{deliveryStatusNames[order.deliveryStatus]}</dd>
            </div>
            {order.trackingNumber?.trim() ? (
              <div>
                <dt>Трек-номер</dt>
                <dd>{order.trackingNumber.trim()}</dd>
              </div>
            ) : null}
          </dl>

          {order.customerComment?.trim() ? (
            <div className={styles.comment}>
              <h3>Комментарий покупателя</h3>
              <p>{order.customerComment.trim()}</p>
            </div>
          ) : null}
        </section>
      </div>

      <section className={styles.itemsSection} aria-labelledby="items-heading">
        <div className={styles.sectionHeader}>
          <h2 id="items-heading" className={styles.sectionTitle}>
            Состав заказа
          </h2>
          <span className={styles.itemCount}>
            Позиций: {order.items.length}
          </span>
        </div>

        {order.items.length > 0 ? (
          <div className={styles.itemsList}>
            <div className={`${styles.itemRow} ${styles.itemHead}`} aria-hidden="true">
              <span>Товар</span>
              <span>Количество</span>
              <span>Цена</span>
              <span>Сумма</span>
            </div>
            {order.items.map((item) => (
              <article className={styles.itemRow} key={item.id}>
                <strong className={styles.productName}>{item.productName}</strong>
                <span data-label="Количество">{item.quantity} шт.</span>
                <span data-label="Цена">
                  {currencyFormatter.format(Number(item.unitPrice))}
                </span>
                <strong data-label="Сумма">
                  {currencyFormatter.format(Number(item.lineTotal))}
                </strong>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>В заказе нет позиций.</p>
        )}
      </section>

      <div className={styles.bottomGrid}>
        <section className={styles.card} aria-labelledby="payment-heading">
          <h2 id="payment-heading" className={styles.sectionTitle}>
            Оплата
          </h2>
          <dl className={styles.detailsList}>
            <div>
              <dt>Способ оплаты</dt>
              <dd>{paymentMethodNames[order.paymentMethod]}</dd>
            </div>
            <div>
              <dt>Статус оплаты</dt>
              <dd>{paymentStatusNames[order.paymentStatus]}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.totalsCard} aria-labelledby="totals-heading">
          <h2 id="totals-heading" className={styles.sectionTitle}>
            Итоги
          </h2>
          <dl className={styles.totalsList}>
            <div>
              <dt>Стоимость товаров</dt>
              <dd>{currencyFormatter.format(itemsTotal)}</dd>
            </div>
            <div>
              <dt>Доставка</dt>
              <dd>{currencyFormatter.format(Number(order.deliveryCost))}</dd>
            </div>
            <div className={styles.grandTotal}>
              <dt>Итоговая сумма</dt>
              <dd>{currencyFormatter.format(Number(order.totalAmount))}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={styles.infoSection} aria-labelledby="info-heading">
        <h2 id="info-heading" className={styles.sectionTitle}>
          Информация о заказе
        </h2>
        <dl className={styles.infoGrid}>
          <div>
            <dt>ID заказа</dt>
            <dd className={styles.monospace}>{order.id}</dd>
          </div>
          <div>
            <dt>Создан</dt>
            <dd>
              <time dateTime={order.createdAt.toISOString()}>
                {dateFormatter.format(order.createdAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Обновлён</dt>
            <dd>
              <time dateTime={order.updatedAt.toISOString()}>
                {dateFormatter.format(order.updatedAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Пользователь</dt>
            <dd>{accountName}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
