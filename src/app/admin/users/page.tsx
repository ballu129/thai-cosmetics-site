import { prisma } from "@/lib/prisma";
import UsersTable from "./UsersTable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Пользователи",
};

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: {
        select: {
          orders: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main style={{ padding: 24 }}>
      <div
        style={{
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>Пользователи</h1>

        <p style={{ marginBottom: 0 }}>
          Всего пользователей: {users.length}
        </p>
      </div>

      <UsersTable
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
          ordersCount: user._count.orders,
        }))}
      />
    </main>
  );
}
