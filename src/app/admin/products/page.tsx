import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import DeleteProductButton from "./DeleteProductButton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 20;
const ALLOWED_PAGE_SIZES = [20, 50, 100] as const;
const HEALING_FILTERS = ["all", "healing", "regular"] as const;
const SORT_OPTIONS = [
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
] as const;

type PageSize = (typeof ALLOWED_PAGE_SIZES)[number];
type HealingFilter = (typeof HEALING_FILTERS)[number];
type SortOption = (typeof SORT_OPTIONS)[number];

type AdminProductsPageProps = {
  searchParams: Promise<{
    search?: string;
    brandId?: string;
    category?: string;
    healing?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
  }>;
};

const sortLabels: Record<SortOption, string> = {
  newest: "Сначала новые",
  oldest: "Сначала старые",
  "name-asc": "Название: А-Я",
  "name-desc": "Название: Я-А",
  "price-asc": "Цена: по возрастанию",
  "price-desc": "Цена: по убыванию",
};

const healingLabels: Record<HealingFilter, string> = {
  all: "Все товары",
  healing: "Только лечебные",
  regular: "Только обычные",
};

const orderByBySort: Record<
  SortOption,
  Prisma.ProductOrderByWithRelationInput
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
  "price-asc": {
    price: "asc",
  },
  "price-desc": {
    price: "desc",
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

function getHealingFilter(
  value: string | undefined,
): HealingFilter {
  if (
    HEALING_FILTERS.includes(value as HealingFilter)
  ) {
    return value as HealingFilter;
  }

  return "all";
}

function getSortOption(value: string | undefined): SortOption {
  if (SORT_OPTIONS.includes(value as SortOption)) {
    return value as SortOption;
  }

  return "newest";
}

function createAdminProductsHref({
  search,
  brandId,
  category,
  healing,
  sort,
  page,
  pageSize,
}: {
  search: string;
  brandId: string;
  category: string;
  healing: HealingFilter;
  sort: SortOption;
  page: number;
  pageSize: PageSize;
}) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  if (brandId) {
    params.set("brandId", brandId);
  }

  if (category) {
    params.set("category", category);
  }

  if (healing !== "all") {
    params.set("healing", healing);
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
    ? `/admin/products?${queryString}`
    : "/admin/products";
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

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const brandId = params.brandId?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const healing = getHealingFilter(params.healing);
  const sort = getSortOption(params.sort);
  const requestedPage = parsePositiveInteger(
    params.page,
    1,
  );
  const pageSize = getPageSize(params.pageSize);

  const where: Prisma.ProductWhereInput = {};

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
        category: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        brand: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  if (brandId) {
    where.brandId = brandId;
  }

  if (category) {
    where.category = {
      equals: category,
      mode: "insensitive",
    };
  }

  if (healing === "healing") {
    where.healing = true;
  }

  if (healing === "regular") {
    where.healing = false;
  }

  const [brands, categories, totalProducts] =
    await Promise.all([
      prisma.brand.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.product.groupBy({
        by: ["category"],
        orderBy: {
          category: "asc",
        },
      }),
      prisma.product.count({
        where,
      }),
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalProducts / pageSize),
  );
  const currentPage = Math.min(
    requestedPage,
    totalPages,
  );
  const skip = (currentPage - 1) * pageSize;

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      price: true,
      healing: true,
      imageUrl: true,
      brand: {
        select: {
          name: true,
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
  const firstProductNumber =
    totalProducts === 0 ? 0 : skip + 1;
  const lastProductNumber = Math.min(
    skip + products.length,
    totalProducts,
  );
  const hasActiveFilters =
    Boolean(search) ||
    Boolean(brandId) ||
    Boolean(category) ||
    healing !== "all";

  const pageHref = (page: number) =>
    createAdminProductsHref({
      search,
      brandId,
      category,
      healing,
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
          <h1 style={{ margin: 0 }}>Товары</h1>

          <p style={{ marginBottom: 0 }}>
            Показаны товары {firstProductNumber}-
            {lastProductNumber} из {totalProducts}
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

      <form
        action="/admin/products"
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
            placeholder="Название, slug, бренд или категория"
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Бренд</span>
          <select
            name="brandId"
            defaultValue={brandId}
            style={inputStyle}
          >
            <option value="">Все бренды</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Категория</span>
          <select
            name="category"
            defaultValue={category}
            style={inputStyle}
          >
            <option value="">Все категории</option>
            {categories.map((item) => (
              <option
                key={item.category}
                value={item.category}
              >
                {item.category}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Лечебный</span>
          <select
            name="healing"
            defaultValue={healing}
            style={inputStyle}
          >
            {HEALING_FILTERS.map((item) => (
              <option key={item} value={item}>
                {healingLabels[item]}
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
              href="/admin/products"
              style={secondaryButtonStyle}
            >
              Сбросить фильтры
            </Link>
          ) : null}
        </div>
      </form>

      {products.length > 0 ? (
        <>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
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
                    <td style={nameCellStyle}>
                      <div style={productNameStyle}>
                        {product.name}
                      </div>
                      <div style={productSlugStyle}>
                        {product.slug}
                      </div>
                    </td>

                    <td style={cellStyle}>
                      {product.brand.name}
                    </td>

                    <td style={cellStyle}>
                      {product.category}
                    </td>

                    <td style={cellStyle}>
                      {Number(product.price).toFixed(2)}
                    </td>

                    <td style={cellStyle}>
                      {product.healing ? "Да" : "Нет"}
                    </td>

                    <td style={cellStyle}>
                      {product.imageUrl
                        ? "Есть изображение"
                        : "Нет изображения"}
                    </td>

                    <td style={cellStyle}>
                      <div style={rowActionsStyle}>
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          style={editLinkStyle}
                        >
                          Редактировать
                        </Link>

                        <DeleteProductButton
                          productId={product.id}
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
              aria-label="Страницы товаров"
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
            Товары по заданным параметрам не найдены.
          </p>

          <Link
            href="/admin/products"
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
    "repeat(auto-fit, minmax(180px, 1fr))",
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
  width: "28%",
};

const productNameStyle = {
  fontWeight: 600,
  lineHeight: 1.35,
  overflowWrap: "anywhere" as const,
} as const;

const productSlugStyle = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.35,
  overflowWrap: "anywhere" as const,
} as const;

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
