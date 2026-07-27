"use client";

import { useMemo, useState } from "react";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  ordersCount: number;
};

type UsersTableProps = {
  users: User[];
};

export default function UsersTable({ users }: UsersTableProps) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.name?.toLowerCase().includes(normalizedSearch) ||
        user.email?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [users, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / pageSize),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );

  return (
    <div>
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
          placeholder="Поиск по имени или email"
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
          value={pageSize}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setCurrentPage(1);
          }}
          style={{ padding: 10 }}
        >
          <option value={20}>20 пользователей</option>
          <option value={50}>50 пользователей</option>
        </select>
      </div>

      <p style={{ marginBottom: 16 }}>
        Найдено пользователей: {filteredUsers.length}
      </p>

      {filteredUsers.length === 0 ? (
        <p>Пользователи не найдены.</p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 1100,
              }}
            >
              <thead>
                <tr>
                  <th style={cellStyle}>ID</th>
                  <th style={cellStyle}>Имя</th>
                  <th style={cellStyle}>Email</th>
                  <th style={cellStyle}>Роль</th>
                  <th style={cellStyle}>Дата регистрации</th>
                  <th style={cellStyle}>Количество заказов</th>
                  <th style={cellStyle}>Действия</th>
                </tr>
              </thead>

              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td style={cellStyle}>{user.id}</td>
                    <td style={cellStyle}>{user.name ?? "—"}</td>
                    <td style={cellStyle}>{user.email ?? "—"}</td>
                    <td style={cellStyle}>USER</td>
                    <td style={cellStyle}>
                      {new Date(user.createdAt).toLocaleString("ru-RU")}
                    </td>
                    <td style={cellStyle}>{user.ordersCount}</td>
                    <td style={cellStyle}>
                      Редактирование ролей недоступно
                    </td>
                  </tr>
                ))}
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
