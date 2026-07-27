"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number | string;
  lineTotal: number | string;
};

type Order = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  totalAmount: number | string;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

type SortOption =
  | "date-desc"
  | "date-asc"
  | "amount-desc"
  | "amount-asc";

const statusNames: Record<OrderStatus, string> = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  PROCESSING: "В обработке",
  SHIPPED: "Отправлен",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"ALL" | OrderStatus>("ALL");
  const [sortOption, setSortOption] =
    useState<SortOption>("date-desc");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch("/api/orders");
        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error ?? "Не удалось загрузить заказы.");
          return;
        }

        setOrders(data.orders);
      } catch {
        setError("Не удалось загрузить заказы.");
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const result = orders.filter((order) => {
      const matchesSearch =
        normalizedSearch === "" ||
        order.customerName
          .toLowerCase()
          .includes(normalizedSearch) ||
        order.phone.toLowerCase().includes(normalizedSearch) ||
        order.email.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return [...result].sort((a, b) => {
      if (sortOption === "date-desc") {
        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      }

      if (sortOption === "date-asc") {
        return (
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
        );
      }

      if (sortOption === "amount-desc") {
        return Number(b.totalAmount) - Number(a.totalAmount);
      }

      return Number(a.totalAmount) - Number(b.totalAmount);
    });
  }, [orders, search, statusFilter, sortOption]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / pageSize),
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const visibleOrders = filteredOrders.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );

  async function changeStatus(
    orderId: string,
    status: OrderStatus,
  ) {
    setUpdatingId(orderId);
    setError("");

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error ?? "Не удалось изменить статус.");
        return;
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId
            ? { ...order, status }
            : order,
        ),
      );
    } catch {
      setError("Не удалось изменить статус.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return <p>Загрузка...</p>;
  }

  if (error && orders.length === 0) {
    return <p style={{ color: "red" }}>{error}</p>;
  }

  return (
    <div>
      {error && (
        <p style={{ color: "red", marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <input
          type="search"
          placeholder="Поиск по имени, телефону или email"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setCurrentPage(1);
          }}
          style={{
            minWidth: 300,
            padding: 10,
          }}
        />

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(
              event.target.value as "ALL" | OrderStatus,
            );
            setCurrentPage(1);
          }}
          style={{ padding: 10 }}
        >
          <option value="ALL">Все статусы</option>

          {Object.entries(statusNames).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={sortOption}
          onChange={(event) => {
            setSortOption(event.target.value as SortOption);
            setCurrentPage(1);
          }}
          style={{ padding: 10 }}
        >
          <option value="date-desc">Сначала новые</option>
          <option value="date-asc">Сначала старые</option>
          <option value="amount-desc">
            Сумма: по убыванию
          </option>
          <option value="amount-asc">
            Сумма: по возрастанию
          </option>
        </select>

        <select
          value={pageSize}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setCurrentPage(1);
          }}
          style={{ padding: 10 }}
        >
          <option value={20}>20 заказов</option>
          <option value={50}>50 заказов</option>
        </select>
      </div>

      <p style={{ marginBottom: 16 }}>
        Найдено заказов: {filteredOrders.length}
      </p>

      {filteredOrders.length === 0 ? (
        <p>Заказы не найдены.</p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 1350,
              }}
            >
              <thead>
                <tr>
                  <th style={cellStyle}>Номер</th>
                  <th style={cellStyle}>Дата</th>
                  <th style={cellStyle}>Пользователь</th>
                  <th style={cellStyle}>Клиент</th>
                  <th style={cellStyle}>Телефон</th>
                  <th style={cellStyle}>Email</th>
                  <th style={cellStyle}>Адрес</th>
                  <th style={cellStyle}>Состав заказа</th>
                  <th style={cellStyle}>Сумма</th>
                  <th style={cellStyle}>Статус</th>
                  <th style={cellStyle}>Действия</th>
                </tr>
              </thead>

              <tbody>
                {visibleOrders.map((order) => {
                  const userName =
                    order.user?.name ||
                    order.user?.email ||
                    "Гость";

                  return (
                    <tr key={order.id}>
                      <td style={cellStyle}>{order.id}</td>

                      <td style={cellStyle}>
                        {new Date(
                          order.createdAt,
                        ).toLocaleString("ru-RU")}
                      </td>

                      <td style={cellStyle}>{userName}</td>

                      <td style={cellStyle}>
                        {order.customerName}
                      </td>

                      <td style={cellStyle}>{order.phone}</td>

                      <td style={cellStyle}>{order.email}</td>

                      <td style={cellStyle}>{order.address}</td>

                      <td style={cellStyle}>
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            style={{ marginBottom: 8 }}
                          >
                            <strong>{item.productName}</strong>
                            <br />
                            {item.quantity} шт. ×{" "}
                            {Number(item.unitPrice).toFixed(2)} ={" "}
                            {Number(item.lineTotal).toFixed(2)}
                          </div>
                        ))}
                      </td>

                      <td style={cellStyle}>
                        {Number(order.totalAmount).toFixed(2)}
                      </td>

                      <td style={cellStyle}>
                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(event) =>
                            changeStatus(
                              order.id,
                              event.target.value as OrderStatus,
                            )
                          }
                          style={{ padding: 8 }}
                        >
                          {Object.entries(statusNames).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>

                        {updatingId === order.id && (
                          <div style={{ marginTop: 6 }}>
                            Сохранение...
                          </div>
                        )}
                      </td>

                      <td style={cellStyle}>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          style={{
                            display: "inline-block",
                            padding: "7px 12px",
                            border: "1px solid #777",
                            borderRadius: 6,
                            color: "inherit",
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                          }}
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 24,
            }}
          >
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() =>
                setCurrentPage((page) => Math.max(1, page - 1))
              }
              style={{ padding: "8px 14px" }}
            >
              Назад
            </button>

            <span>
              Страница {safeCurrentPage} из {totalPages}
            </span>

            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) =>
                  Math.min(totalPages, page + 1),
                )
              }
              style={{ padding: "8px 14px" }}
            >
              Далее
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const cellStyle = {
  borderBottom: "1px solid #ddd",
  padding: 12,
  textAlign: "left" as const,
  verticalAlign: "top" as const,
};
