import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import styles from "./admin-dashboard.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Панель управления",
};

const orderStatusLabels: Record<OrderStatus, string> = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  PROCESSING: "В обработке",
  SHIPPED: "Отправлен",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "short",
});

function getSettledValue<T>(result: PromiseSettledResult<T>) {
  return result.status === "fulfilled" ? result.value : null;
}

export default async function AdminDashboardPage() {
  const [
    productMetricsResult,
    brandMetricsResult,
    orderMetricsResult,
    wholesaleMetricsResult,
    latestProductsResult,
    latestOrdersResult,
  ] = await Promise.allSettled([
    Promise.all([
      prisma.product.count(),
      prisma.product.count({
        where: {
          OR: [{ imageUrl: null }, { imageUrl: "" }],
        },
      }),
    ]),
    Promise.all([
      prisma.brand.count(),
      prisma.brand.count({ where: { isActive: true } }),
      prisma.brand.count({ where: { isActive: false } }),
    ]),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.wholesaleRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        brand: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
    }),
    prisma.order.findMany({
      select: {
        id: true,
        customerName: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
    }),
  ]);

  const productMetrics = getSettledValue(productMetricsResult);
  const brandMetrics = getSettledValue(brandMetricsResult);
  const orderGroups = getSettledValue(orderMetricsResult);
  const wholesaleGroups = getSettledValue(wholesaleMetricsResult);
  const latestProducts = getSettledValue(latestProductsResult);
  const latestOrders = getSettledValue(latestOrdersResult);

  const orderCounts = orderGroups
    ? new Map(
        orderGroups.map((group) => [
          group.status,
          group._count._all,
        ]),
      )
    : null;
  const totalOrders = orderGroups
    ? orderGroups.reduce(
        (total, group) => total + group._count._all,
        0,
      )
    : null;
  const newOrders = orderCounts?.get("NEW") ?? 0;
  const processingOrders = orderCounts?.get("PROCESSING") ?? 0;
  const wholesaleCounts = wholesaleGroups
    ? new Map(
        wholesaleGroups.map((group) => [group.status, group._count._all]),
      )
    : null;
  const totalWholesaleRequests = wholesaleGroups
    ? wholesaleGroups.reduce(
        (total, group) => total + group._count._all,
        0,
      )
    : null;
  const newWholesaleRequests = wholesaleCounts?.get("NEW") ?? 0;
  const processingWholesaleRequests = wholesaleCounts?.get("IN_PROGRESS") ?? 0;
  const hasUnavailableData = [
    productMetricsResult,
    brandMetricsResult,
    orderMetricsResult,
    wholesaleMetricsResult,
    latestProductsResult,
    latestOrdersResult,
  ].some((result) => result.status === "rejected");

  const warnings = [
    productMetrics && productMetrics[1] > 0
      ? {
          label: "Товары без изображения",
          count: productMetrics[1],
          href: "/admin/products",
        }
      : null,
    brandMetrics && brandMetrics[2] > 0
      ? {
          label: "Отключённые бренды",
          count: brandMetrics[2],
          href: "/admin/brands?status=inactive",
        }
      : null,
    orderGroups && newOrders > 0
      ? {
          label: "Новые заказы ожидают обработки",
          count: newOrders,
          href: "/admin/orders",
        }
      : null,
    wholesaleGroups && newWholesaleRequests > 0
      ? {
          label: "Новые оптовые заявки ожидают обработки",
          count: newWholesaleRequests,
          href: "/admin/wholesale-orders?status=NEW",
        }
      : null,
  ].filter((warning): warning is NonNullable<typeof warning> => Boolean(warning));

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>SIAM CARE</p>
          <h1 className={styles.title}>Панель управления</h1>
          <p className={styles.subtitle}>
            Управление каталогом, брендами, заказами и оптовыми заявками SIAM CARE.
          </p>
        </div>
      </header>

      {hasUnavailableData ? (
        <p className={styles.dataNotice} role="status">
          Часть сводных данных временно недоступна. Основные разделы
          продолжают работать.
        </p>
      ) : null}

      <section aria-labelledby="sections-title">
        <h2 id="sections-title" className={styles.sectionTitle}>
          Основные разделы
        </h2>

        <div className={styles.sectionGrid}>
          <article className={styles.sectionCard}>
            <div>
              <p className={styles.cardLabel}>Товары</p>
              <p className={styles.primaryMetric}>
                {productMetrics ? productMetrics[0] : "—"}
              </p>
              <p className={styles.metricCaption}>в каталоге</p>
            </div>

            <nav className={styles.cardLinks} aria-label="Товары">
              <Link href="/admin/products">Управление товарами</Link>
              <Link href="/admin/products/new">Добавить товар</Link>
              <Link href="/admin/products/import">Массовый импорт</Link>
            </nav>
          </article>

          <article className={styles.sectionCard}>
            <div>
              <p className={styles.cardLabel}>Оптовые заявки</p>
              <p className={styles.primaryMetric}>
                {totalWholesaleRequests ?? "—"}
              </p>
              <div className={styles.orderMetrics}>
                <span>
                  Новых: {wholesaleGroups ? newWholesaleRequests : "—"}
                </span>
                <span>
                  В обработке:{" "}
                  {wholesaleGroups ? processingWholesaleRequests : "—"}
                </span>
              </div>
            </div>

            <nav className={styles.cardLinks} aria-label="Оптовые заявки">
              <Link href="/admin/wholesale-orders">
                Управление оптовыми заявками
              </Link>
              <Link href="/admin/wholesale-orders?status=NEW">
                Новые оптовые заявки
              </Link>
            </nav>
          </article>

          <article className={styles.sectionCard}>
            <div>
              <p className={styles.cardLabel}>Бренды</p>
              <div className={styles.metricRow}>
                <div>
                  <p className={styles.primaryMetric}>
                    {brandMetrics ? brandMetrics[0] : "—"}
                  </p>
                  <p className={styles.metricCaption}>всего</p>
                </div>
                <div>
                  <p className={styles.secondaryMetric}>
                    {brandMetrics ? brandMetrics[1] : "—"}
                  </p>
                  <p className={styles.metricCaption}>активных</p>
                </div>
              </div>
            </div>

            <nav className={styles.cardLinks} aria-label="Бренды">
              <Link href="/admin/brands">Управление брендами</Link>
              <Link href="/admin/brands/new">Добавить бренд</Link>
            </nav>
          </article>

          <article className={styles.sectionCard}>
            <div>
              <p className={styles.cardLabel}>Заказы</p>
              <p className={styles.primaryMetric}>{totalOrders ?? "—"}</p>
              <div className={styles.orderMetrics}>
                <span>Новых: {orderGroups ? newOrders : "—"}</span>
                <span>
                  В обработке: {orderGroups ? processingOrders : "—"}
                </span>
              </div>
            </div>

            <nav className={styles.cardLinks} aria-label="Заказы">
              <Link href="/admin/orders">Управление заказами</Link>
            </nav>
          </article>
        </div>
      </section>

      <section className={styles.quickActions} aria-labelledby="actions-title">
        <h2 id="actions-title" className={styles.sectionTitle}>
          Быстрые действия
        </h2>

        <div className={styles.actionList}>
          <Link className={styles.primaryAction} href="/admin/products/new">
            Добавить товар
          </Link>
          <Link className={styles.secondaryAction} href="/admin/products/import">
            Импортировать товары
          </Link>
          <Link className={styles.secondaryAction} href="/admin/brands/new">
            Добавить бренд
          </Link>
          <Link className={styles.secondaryAction} href="/admin/orders">
            Открыть заказы
          </Link>
          <Link className={styles.secondaryAction} href="/admin/wholesale-orders">
            Открыть оптовые заявки
          </Link>
        </div>
      </section>

      {warnings.length > 0 ? (
        <section className={styles.warningSection} aria-labelledby="warnings-title">
          <h2 id="warnings-title" className={styles.sectionTitle}>
            Требуют внимания
          </h2>

          <div className={styles.warningList}>
            {warnings.map((warning) => (
              <Link key={warning.label} href={warning.href} className={styles.warningItem}>
                <span>{warning.label}</span>
                <strong>{warning.count}</strong>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className={styles.recentGrid}>
        <section className={styles.listSection} aria-labelledby="recent-orders-title">
          <div className={styles.sectionHeadingRow}>
            <h2 id="recent-orders-title" className={styles.sectionTitle}>
              Последние заказы
            </h2>
            <Link href="/admin/orders" className={styles.inlineLink}>
              Все заказы
            </Link>
          </div>

          {latestOrders === null ? (
            <p className={styles.emptyState}>Не удалось загрузить последние заказы.</p>
          ) : latestOrders.length === 0 ? (
            <p className={styles.emptyState}>Заказов пока нет.</p>
          ) : (
            <div className={styles.itemList}>
              {latestOrders.map((order) => (
                <article key={order.id} className={styles.listItem}>
                  <div className={styles.listItemBody}>
                    <strong className={styles.breakText}>{order.id}</strong>
                    <span>{dateFormatter.format(order.createdAt)}</span>
                    <span className={styles.breakText}>{order.customerName}</span>
                  </div>
                  <div className={styles.listItemMeta}>
                    <strong>{currencyFormatter.format(Number(order.totalAmount))}</strong>
                    <span className={styles.statusBadge}>
                      {orderStatusLabels[order.status]}
                    </span>
                    <Link href={`/admin/orders/${order.id}`} className={styles.inlineLink}>
                      Открыть
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.listSection} aria-labelledby="recent-products-title">
          <div className={styles.sectionHeadingRow}>
            <h2 id="recent-products-title" className={styles.sectionTitle}>
              Последние товары
            </h2>
            <Link href="/admin/products" className={styles.inlineLink}>
              Все товары
            </Link>
          </div>

          {latestProducts === null ? (
            <p className={styles.emptyState}>Не удалось загрузить последние товары.</p>
          ) : latestProducts.length === 0 ? (
            <p className={styles.emptyState}>Товаров пока нет.</p>
          ) : (
            <div className={styles.itemList}>
              {latestProducts.map((product) => (
                <article key={product.id} className={styles.listItem}>
                  <div className={styles.listItemBody}>
                    <strong className={styles.breakText}>{product.name}</strong>
                    <span className={styles.breakText}>{product.brand.name}</span>
                    <span className={styles.breakText}>{product.category}</span>
                  </div>
                  <div className={styles.listItemMeta}>
                    <strong>{currencyFormatter.format(Number(product.price))}</strong>
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className={styles.inlineLink}
                    >
                      Редактировать
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
