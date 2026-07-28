import Link from "next/link";
import DeleteBrandButton from "./DeleteBrandButton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Бренды",
};

export default async function AdminBrandsPage() {
  const brands = await prisma.brand.findMany({
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
          <h1 style={{ margin: 0 }}>Бренды</h1>

          <p style={{ marginBottom: 0 }}>
            Всего брендов: {brands.length}
          </p>
        </div>

        <Link
          href="/admin/brands/new"
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
          Добавить бренд
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
            {brands.map((brand) => (
              <tr key={brand.id}>
                <td style={cellStyle}>{brand.name}</td>
                <td style={cellStyle}>{brand.slug}</td>
                <td style={cellStyle}>
                  {brand.isActive ? "Активен" : "Неактивен"}
                </td>
                <td style={cellStyle}>{brand._count.products}</td>
                <td style={cellStyle}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Link
                      href={`/admin/brands/${brand.id}/edit`}
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

                    <DeleteBrandButton
                      brandId={brand.id}
                      disabled={brand._count.products > 0}
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
