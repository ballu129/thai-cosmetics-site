import Link from "next/link";
import DeleteProductButton from "./DeleteProductButton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      brand: true,
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
          <h1 style={{ margin: 0 }}>Товары</h1>

          <p style={{ marginBottom: 0 }}>
            Всего товаров: {products.length}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <Link
            href="/admin/products/import"
            style={actionLinkStyle}
          >
            Импорт
          </Link>

          <Link
            href="/admin/products/new"
            style={actionLinkStyle}
          >
            Добавить товар
          </Link>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 1050,
          }}
        >
          <thead>
            <tr>
              <th style={cellStyle}>Название</th>
              <th style={cellStyle}>Бренд</th>
              <th style={cellStyle}>Категория</th>
              <th style={cellStyle}>Цена</th>
              <th style={cellStyle}>Лечебный</th>
              <th style={cellStyle}>Изображение</th>
              <th style={cellStyle}>Действия</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td style={cellStyle}>{product.name}</td>

                <td style={cellStyle}>{product.brand.name}</td>

                <td style={cellStyle}>{product.category}</td>

                <td style={cellStyle}>
                  {Number(product.price).toFixed(2)}
                </td>

                <td style={cellStyle}>
                  {product.healing ? "Да" : "Нет"}
                </td>

                <td style={cellStyle}>
                  {product.imageUrl ?? "Нет изображения"}
                </td>

                <td style={cellStyle}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Link
                      href={`/admin/products/${product.id}/edit`}
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

                    <DeleteProductButton productId={product.id} />
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

const actionLinkStyle = {
  display: "inline-block",
  padding: "10px 16px",
  border: "1px solid #777",
  borderRadius: 6,
  color: "inherit",
  textDecoration: "none",
  whiteSpace: "nowrap",
} as const;

const cellStyle = {
  borderBottom: "1px solid #ddd",
  padding: 12,
  textAlign: "left" as const,
  verticalAlign: "top" as const,
};
