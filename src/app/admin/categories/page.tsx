import Link from "next/link";
import DeleteCategoryButton from "./DeleteCategoryButton";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Категории",
};

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          products: true,
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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Категории</h1>

          <p style={{ marginBottom: 0 }}>
            Всего категорий: {categories.length}
          </p>
        </div>

        <Link
          href="/admin/categories/new"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            border: "1px solid #777",
            borderRadius: 6,
            color: "inherit",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Добавить категорию
        </Link>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 900,
          }}
        >
          <thead>
            <tr>
              <th style={cellStyle}>Название</th>
              <th style={cellStyle}>Slug</th>
              <th style={cellStyle}>Активность</th>
              <th style={cellStyle}>Количество товаров</th>
              <th style={cellStyle}>Действия</th>
            </tr>
          </thead>

          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td style={cellStyle}>{category.name}</td>
                <td style={cellStyle}>{category.slug}</td>
                <td style={cellStyle}>
                  {category.isActive ? "Активна" : "Неактивна"}
                </td>
                <td style={cellStyle}>{category._count.products}</td>
                <td style={cellStyle}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Link
                      href={`/admin/categories/${category.id}/edit`}
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
                      Редактировать
                    </Link>

                    <DeleteCategoryButton
                      categoryId={category.id}
                      disabled={category._count.products > 0}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const cellStyle = {
  borderBottom: "1px solid #ddd",
  padding: 12,
  textAlign: "left" as const,
  verticalAlign: "top" as const,
};
