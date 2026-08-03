import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import DeleteBrandButton from "./DeleteBrandButton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Бренды",
};

const DEFAULT_PAGE_SIZE = 20;
const ALLOWED_PAGE_SIZES = [20, 50, 100] as const;
const STATUS_FILTERS = ["all", "active", "inactive"] as const;
const SORT_OPTIONS = [
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
  "products-desc",
  "products-asc",
] as const;

type PageSize = (typeof ALLOWED_PAGE_SIZES)[number];
type StatusFilter = (typeof STATUS_FILTERS)[number];
type SortOption = (typeof SORT_OPTIONS)[number];

type AdminBrandsPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
  }>;
};

const statusLabels: Record<StatusFilter, string> = {
  all: "Все бренды",
  active: "Только активные",
  inactive: "Только отключённые",
};

const sortLabels: Record<SortOption, string> = {
  newest: "Сначала новые",
  oldest: "Сначала старые",
  "name-asc": "Название: А-Я",
  "name-desc": "Название: Я-А",
  "products-desc": "Больше товаров",
  "products-asc": "Меньше товаров",
};

const orderByBySort: Record<
  SortOption,
  Prisma.BrandOrderByWithRelationInput
> = {
  newest: {
    createdAt: "desc",
  },
  oldest: {
    createdAt: "asc",
  },
  "name-asc": {
    name: "asc",
  },
  "name-desc": {
    name: "desc",
  },
  "products-desc": {
    products: {
      _count: "desc",
    },
  },
  "products-asc": {
    products: {
      _count: "asc",
    },
  },
};

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
) {
  const parsedValue = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return parsedValue;
}

function getPageSize(value: string | undefined): PageSize {
  const requestedPageSize = parsePositiveInteger(
    value,
    DEFAULT_PAGE_SIZE,
  );

  if (
    ALLOWED_PAGE_SIZES.includes(
      requestedPageSize as PageSize,
    )
  ) {
    return requestedPageSize as PageSize;
  }

  return DEFAULT_PAGE_SIZE;
}

function getStatusFilter(
  value: string | undefined,
): StatusFilter {
  if (STATUS_FILTERS.includes(value as StatusFilter)) {
    return value as StatusFilter;
  }

  return "all";
}

function getSortOption(value: string | undefined): SortOption {
  if (SORT_OPTIONS.includes(value as SortOption)) {
    return value as SortOption;
  }

  return "newest";
}

function createAdminBrandsHref({
  search,
  status,
  sort,
  page,
  pageSize,
}: {
  search: string;
  status: StatusFilter;
  sort: SortOption;
  page: number;
  pageSize: PageSize;
}) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  if (status !== "all") {
    params.set("status", status);
  }

  if (sort !== "newest") {
    params.set("sort", sort);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  if (pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(pageSize));
  }

  const queryString = params.toString();

  return queryString
    ? `/admin/brands?${queryString}`
    : "/admin/brands";
}

function getVisiblePages(
  currentPage: number,
  totalPages: number,
) {
  const pages = new Set<number>();

  pages.add(1);
  pages.add(totalPages);

  for (
    let pageNumber = currentPage - 2;
    pageNumber <= currentPage + 2;
    pageNumber += 1
  ) {
    if (
      pageNumber >= 1 &&
      pageNumber <= totalPages
    ) {
      pages.add(pageNumber);
    }
  }

  return Array.from(pages).sort(
    (firstPage, secondPage) =>
      firstPage - secondPage,
  );
}

export default async function AdminBrandsPage({
  searchParams,
}: AdminBrandsPageProps) {
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const status = getStatusFilter(params.status);
  const sort = getSortOption(params.sort);
  const requestedPage = parsePositiveInteger(
    params.page,
    1,
  );
  const pageSize = getPageSize(params.pageSize);

  const where: Prisma.BrandWhereInput = {};

  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        slug: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (status === "active") {
    where.isActive = true;
  }

  if (status === "inactive") {
    where.isActive = false;
  }

  const totalBrands = await prisma.brand.count({
    where,
  });

  const totalPages = Math.max(
    1,
    Math.ceil(totalBrands / pageSize),
  );
  const currentPage = Math.min(
    requestedPage,
    totalPages,
  );
  const skip = (currentPage - 1) * pageSize;

  const brands = await prisma.brand.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      logoUrl: true,
      websiteUrl: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: [
      orderByBySort[sort],
      {
        id: "asc",
      },
    ],
    skip,
    take: pageSize,
  });

  const visiblePages = getVisiblePages(
    currentPage,
    totalPages,
  );
  const firstBrandNumber =
    totalBrands === 0 ? 0 : skip + 1;
  const lastBrandNumber = Math.min(
    skip + brands.length,
    totalBrands,
  );
  const hasActiveFilters =
    Boolean(search) || status !== "all";

  const pageHref = (page: number) =>
    createAdminBrandsHref({
      search,
      status,
      sort,
      page,
      pageSize,
    });

  return (
    <main style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Бренды</h1>

          <p style={{ marginBottom: 0 }}>
            Показаны бренды {firstBrandNumber}-
            {lastBrandNumber} из {totalBrands}
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
          <Link href="/admin/products" style={actionLinkStyle}>
            Назад к товарам
          </Link>

          <Link
            href="/admin/brands/new"
            style={actionLinkStyle}
          >
            Добавить бренд
          </Link>
        </div>
      </div>

      <form
        action="/admin/brands"
        method="get"
        style={filterPanelStyle}
      >
        <input type="hidden" name="page" value="1" />

        <label style={fieldStyle}>
          <span style={labelStyle}>Поиск</span>
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Название, slug или описание"
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Статус</span>
          <select
            name="status"
            defaultValue={status}
            style={inputStyle}
          >
            {STATUS_FILTERS.map((item) => (
              <option key={item} value={item}>
                {statusLabels[item]}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Сортировка</span>
          <select
            name="sort"
            defaultValue={sort}
            style={inputStyle}
          >
            {SORT_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {sortLabels[item]}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>На странице</span>
          <select
            name="pageSize"
            defaultValue={pageSize}
            style={inputStyle}
          >
            {ALLOWED_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div style={filterActionsStyle}>
          <button type="submit" style={primaryButtonStyle}>
            Применить
          </button>

          {hasActiveFilters ? (
            <Link
              href="/admin/brands"
              style={secondaryButtonStyle}
            >
              Сбросить фильтры
            </Link>
          ) : null}
        </div>
      </form>

      {brands.length > 0 ? (
        <>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={cellStyle}>Название</th>
                  <th style={cellStyle}>Slug</th>
                  <th style={cellStyle}>Товаров</th>
                  <th style={cellStyle}>Статус</th>
                  <th style={cellStyle}>Логотип</th>
                  <th style={cellStyle}>Сайт бренда</th>
                  <th style={cellStyle}>Действия</th>
                </tr>
              </thead>

              <tbody>
                {brands.map((brand) => (
                  <tr key={brand.id}>
                    <td style={nameCellStyle}>{brand.name}</td>
                    <td style={cellStyle}>{brand.slug}</td>
                    <td style={cellStyle}>
                      {brand._count.products}
                    </td>
                    <td style={cellStyle}>
                      {brand.isActive ? "Активен" : "Отключён"}
                    </td>
                    <td style={cellStyle}>
                      {brand.logoUrl
                        ? "Есть логотип"
                        : "Нет логотипа"}
                    </td>
                    <td style={cellStyle}>
                      {brand.websiteUrl ? (
                        <a
                          href={brand.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={compactLinkStyle}
                        >
                          Открыть сайт
                        </a>
                      ) : (
                        "Нет сайта"
                      )}
                    </td>
                    <td style={cellStyle}>
                      <div style={rowActionsStyle}>
                        <Link
                          href={`/admin/brands/${brand.id}/edit`}
                          style={editLinkStyle}
                        >
                          Редактировать
                        </Link>

                        <DeleteBrandButton
                          brandId={brand.id}
                          productCount={brand._count.products}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <nav
              aria-label="Страницы брендов"
              style={paginationStyle}
            >
              {currentPage > 1 ? (
                <Link
                  href={pageHref(currentPage - 1)}
                  style={pageLinkStyle}
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
                  <span
                    key={pageNumber}
                    style={paginationItemStyle}
                  >
                    {showGap ? (
                      <span style={pageGapStyle}>...</span>
                    ) : null}

                    <Link
                      href={pageHref(pageNumber)}
                      aria-current={
                        pageNumber === currentPage
                          ? "page"
                          : undefined
                      }
                      style={
                        pageNumber === currentPage
                          ? currentPageLinkStyle
                          : pageLinkStyle
                      }
                    >
                      {pageNumber}
                    </Link>
                  </span>
                );
              })}

              {currentPage < totalPages ? (
                <Link
                  href={pageHref(currentPage + 1)}
                  style={pageLinkStyle}
                >
                  Вперёд
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      ) : (
        <div style={emptyStateStyle}>
          <p style={{ marginTop: 0 }}>
            Бренды по заданным параметрам не найдены.
          </p>

          <Link
            href="/admin/brands"
            style={secondaryButtonStyle}
          >
            Сбросить фильтры
          </Link>
        </div>
      )}
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

const filterPanelStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
  marginBottom: 24,
  padding: 16,
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#fff",
} as const;

const fieldStyle = {
  display: "grid",
  gap: 6,
  minWidth: 0,
} as const;

const labelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
} as const;

const inputStyle = {
  width: "100%",
  minWidth: 0,
  padding: "9px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  background: "#fff",
} as const;

const filterActionsStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "end",
} as const;

const primaryButtonStyle = {
  padding: "10px 14px",
  border: "1px solid #254b3f",
  borderRadius: 6,
  background: "#254b3f",
  color: "#fff",
  cursor: "pointer",
  whiteSpace: "nowrap",
} as const;

const secondaryButtonStyle = {
  display: "inline-block",
  padding: "10px 14px",
  border: "1px solid #777",
  borderRadius: 6,
  color: "inherit",
  textDecoration: "none",
  whiteSpace: "nowrap",
} as const;

const tableWrapperStyle = {
  width: "100%",
  overflowX: "auto",
} as const;

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 980,
  tableLayout: "fixed",
} as const;

const cellStyle = {
  borderBottom: "1px solid #ddd",
  padding: 12,
  textAlign: "left" as const,
  verticalAlign: "top" as const,
  overflowWrap: "anywhere" as const,
};

const nameCellStyle = {
  ...cellStyle,
  width: "22%",
  fontWeight: 600,
};

const rowActionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
} as const;

const editLinkStyle = {
  display: "inline-block",
  padding: "7px 12px",
  border: "1px solid #777",
  borderRadius: 6,
  color: "inherit",
  textDecoration: "none",
  whiteSpace: "nowrap",
} as const;

const compactLinkStyle = {
  color: "#254b3f",
  textDecoration: "underline",
  textUnderlineOffset: 3,
} as const;

const paginationStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
  marginTop: 20,
} as const;

const paginationItemStyle = {
  display: "inline-flex",
  gap: 8,
  alignItems: "center",
} as const;

const pageLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 38,
  height: 38,
  padding: "0 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  color: "inherit",
  textDecoration: "none",
  background: "#fff",
} as const;

const currentPageLinkStyle = {
  ...pageLinkStyle,
  borderColor: "#254b3f",
  background: "#254b3f",
  color: "#fff",
} as const;

const pageGapStyle = {
  color: "#64748b",
} as const;

const emptyStateStyle = {
  padding: 24,
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#fff",
} as const;
