"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./orders.module.css";

const ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const;
const SORT_OPTIONS = [
  "date-desc",
  "date-asc",
  "amount-desc",
  "amount-asc",
] as const;
const PAGE_SIZES = [20, 50, 100] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];
type StatusFilter = "ALL" | OrderStatus;
type SortOption = (typeof SORT_OPTIONS)[number];
type PageSize = (typeof PAGE_SIZES)[number];

type Order = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  totalAmount: number | string;
  status: OrderStatus;
  createdAt: string;
  user: {
    name: string | null;
    email: string | null;
  } | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  firstItem: number;
  lastItem: number;
};

type OrdersResponse = {
  success: boolean;
  orders?: Order[];
  pagination?: Pagination;
  error?: string;
};

const statusNames: Record<OrderStatus, string> = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  PROCESSING: "В обработке",
  SHIPPED: "Отправлен",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

const sortNames: Record<SortOption, string> = {
  "date-desc": "Сначала новые",
  "date-asc": "Сначала старые",
  "amount-desc": "Сумма: по убыванию",
  "amount-asc": "Сумма: по возрастанию",
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

function getStatusFilter(value: string | null): StatusFilter {
  if (ORDER_STATUSES.includes(value as OrderStatus)) {
    return value as OrderStatus;
  }

  return "ALL";
}

function getSortOption(value: string | null): SortOption {
  if (SORT_OPTIONS.includes(value as SortOption)) {
    return value as SortOption;
  }

  return "date-desc";
}

function getPageSize(value: string | null): PageSize {
  const parsed = Number.parseInt(value ?? "", 10);

  if (PAGE_SIZES.includes(parsed as PageSize)) {
    return parsed as PageSize;
  }

  return 20;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages]);

  for (
    let pageNumber = currentPage - 2;
    pageNumber <= currentPage + 2;
    pageNumber += 1
  ) {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      pages.add(pageNumber);
    }
  }

  return Array.from(pages).sort((first, second) => first - second);
}

function shortenOrderId(orderId: string) {
  if (orderId.length <= 18) {
    return orderId;
  }

  return `${orderId.slice(0, 9)}…${orderId.slice(-6)}`;
}

export default function OrdersTable() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const search = searchParams.get("search")?.trim() ?? "";
  const status = getStatusFilter(searchParams.get("status"));
  const sort = getSortOption(searchParams.get("sort"));
  const pageSize = getPageSize(searchParams.get("pageSize"));

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const activeQueryRef = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const queryChanged = activeQueryRef.current !== queryString;

    activeQueryRef.current = queryString;

    async function loadOrders() {
      setError("");

      if (queryChanged) {
        setOrders(null);
        setPagination(null);
      }

      try {
        const response = await fetch(
          queryString ? `/api/orders?${queryString}` : "/api/orders",
          { signal: controller.signal },
        );
        const data = (await response.json()) as OrdersResponse;

        if (
          !response.ok ||
          !data.success ||
          !data.orders ||
          !data.pagination
        ) {
          setError(data.error ?? "Не удалось загрузить заказы.");
          return;
        }

        setOrders(data.orders);
        setPagination(data.pagination);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        setError("Не удалось загрузить заказы.");
      }
    }

    loadOrders();

    return () => controller.abort();
  }, [queryString, reloadKey]);

  const visiblePages = useMemo(
    () =>
      pagination
        ? getVisiblePages(pagination.page, pagination.totalPages)
        : [],
    [pagination],
  );

  function createPageHref(page: number) {
    const params = new URLSearchParams();

    if (search) params.set("search", search);
    if (status !== "ALL") params.set("status", status);
    if (sort !== "date-desc") params.set("sort", sort);
    if (pageSize !== 20) params.set("pageSize", String(pageSize));
    if (page > 1) params.set("page", String(page));

    const nextQuery = params.toString();
    return nextQuery ? `/admin/orders?${nextQuery}` : "/admin/orders";
  }

  async function changeStatus(orderId: string, nextStatus: OrderStatus) {
    setUpdatingId(orderId);
    setError("");

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error ?? "Не удалось изменить статус заказа.");
        return;
      }

      setOrders((currentOrders) =>
        currentOrders?.map((order) =>
          order.id === orderId
            ? { ...order, status: nextStatus }
            : order,
        ) ?? null,
      );
      setReloadKey((currentKey) => currentKey + 1);
    } catch {
      setError("Не удалось изменить статус заказа.");
    } finally {
      setUpdatingId(null);
    }
  }

  const hasActiveFilters =
    Boolean(search) ||
    status !== "ALL" ||
    sort !== "date-desc" ||
    pageSize !== 20;

  return (
    <div className={styles.ordersArea}>
      <form action="/admin/orders" method="get" className={styles.filterPanel}>
        <input type="hidden" name="page" value="1" />

        <label className={styles.field}>
          <span className={styles.label}>Поиск</span>
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Имя, телефон или email"
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Статус</span>
          <select name="status" defaultValue={status} className={styles.input}>
            <option value="ALL">Все статусы</option>
            {ORDER_STATUSES.map((item) => (
              <option key={item} value={item}>
                {statusNames[item]}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Сортировка</span>
          <select name="sort" defaultValue={sort} className={styles.input}>
            {SORT_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {sortNames[item]}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>На странице</span>
          <select name="pageSize" defaultValue={pageSize} className={styles.input}>
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.filterActions}>
          <button type="submit" className={styles.primaryButton}>
            Применить
          </button>

          {hasActiveFilters ? (
            <Link href="/admin/orders" className={styles.secondaryButton}>
              Сбросить фильтры
            </Link>
          ) : null}
        </div>
      </form>

      {error ? (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      ) : null}

      {orders === null && !error ? <p>Загрузка заказов…</p> : null}

      {orders && pagination ? (
        <>
          <p className={styles.resultsSummary}>
            Показаны заказы {pagination.firstItem}–{pagination.lastItem} из{" "}
            {pagination.totalItems}
          </p>

          {orders.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Заказы по заданным параметрам не найдены.</p>
              <Link href="/admin/orders" className={styles.secondaryButton}>
                Сбросить фильтры
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <colgroup>
                    <col className={styles.numberColumn} />
                    <col className={styles.dateColumn} />
                    <col className={styles.userColumn} />
                    <col className={styles.customerColumn} />
                    <col className={styles.phoneColumn} />
                    <col className={styles.emailColumn} />
                    <col className={styles.amountColumn} />
                    <col className={styles.statusColumn} />
                    <col className={styles.actionsColumn} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Номер</th>
                      <th>Дата</th>
                      <th>Пользователь</th>
                      <th>Клиент</th>
                      <th>Телефон</th>
                      <th>Email</th>
                      <th>Сумма</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>

                  <tbody>
                    {orders.map((order) => {
                      const userName =
                        order.user?.name || order.user?.email || "Гость";

                      return (
                        <tr key={order.id}>
                          <td>
                            <span
                              className={styles.orderNumber}
                              title={order.id}
                              aria-label={`Номер заказа ${order.id}`}
                            >
                              {shortenOrderId(order.id)}
                            </span>
                          </td>
                          <td className={styles.dateCell}>
                            {dateFormatter.format(new Date(order.createdAt))}
                          </td>
                          <td className={styles.wrapCell}>{userName}</td>
                          <td className={styles.wrapCell}>{order.customerName}</td>
                          <td className={styles.nowrapCell}>
                            <a href={`tel:${order.phone}`}>{order.phone}</a>
                          </td>
                          <td className={styles.emailCell}>
                            <a href={`mailto:${order.email}`}>{order.email}</a>
                          </td>
                          <td className={styles.amountCell}>
                            {currencyFormatter.format(Number(order.totalAmount))}
                          </td>
                          <td className={styles.statusCell}>
                            <select
                              value={order.status}
                              disabled={updatingId === order.id}
                              onChange={(event) =>
                                changeStatus(
                                  order.id,
                                  event.target.value as OrderStatus,
                                )
                              }
                              aria-label={`Статус заказа ${order.id}`}
                              className={styles.statusSelect}
                            >
                              {ORDER_STATUSES.map((item) => (
                                <option key={item} value={item}>
                                  {statusNames[item]}
                                </option>
                              ))}
                            </select>
                            {updatingId === order.id ? (
                              <span className={styles.savingText}>Сохранение…</span>
                            ) : null}
                          </td>
                          <td>
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className={styles.openLink}
                              aria-label={`Открыть заказ ${order.id}`}
                            >
                              Открыть
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 ? (
                <nav aria-label="Страницы заказов" className={styles.pagination}>
                  {pagination.page > 1 ? (
                    <Link
                      href={createPageHref(pagination.page - 1)}
                      className={styles.pageLink}
                    >
                      Назад
                    </Link>
                  ) : null}

                  {visiblePages.map((pageNumber, index) => {
                    const previousPage = visiblePages[index - 1];
                    const showGap =
                      previousPage !== undefined &&
                      pageNumber - previousPage > 1;

                    return (
                      <span key={pageNumber} className={styles.paginationItem}>
                        {showGap ? <span className={styles.pageGap}>…</span> : null}
                        <Link
                          href={createPageHref(pageNumber)}
                          aria-current={
                            pageNumber === pagination.page ? "page" : undefined
                          }
                          className={
                            pageNumber === pagination.page
                              ? styles.currentPageLink
                              : styles.pageLink
                          }
                        >
                          {pageNumber}
                        </Link>
                      </span>
                    );
                  })}

                  {pagination.page < pagination.totalPages ? (
                    <Link
                      href={createPageHref(pagination.page + 1)}
                      className={styles.pageLink}
                    >
                      Вперёд
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
