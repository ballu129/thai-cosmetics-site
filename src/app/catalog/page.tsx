import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";
import CatalogFilters from "./CatalogFilters";
import styles from "./Catalog.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Каталог тайской косметики",
  description:
    "Оригинальная косметика из Таиланда для ухода за лицом, телом и волосами с доставкой в Россию и страны СНГ.",
  alternates: {
    canonical: "/catalog",
  },
};

const PAGE_SIZES = [24, 48, 96] as const;
const SORT_OPTIONS = [
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
] as const;
const HEALING_OPTIONS = ["all", "true", "false"] as const;

type PageSize = (typeof PAGE_SIZES)[number];
type SortOption = (typeof SORT_OPTIONS)[number];
type HealingOption = (typeof HEALING_OPTIONS)[number];
type QueryValue = string | string[] | undefined;

type CatalogProps = {
  searchParams: Promise<{
    search?: QueryValue;
    brand?: QueryValue;
    category?: QueryValue;
    healing?: QueryValue;
    sort?: QueryValue;
    page?: QueryValue;
    pageSize?: QueryValue;
    limit?: QueryValue;
  }>;
};

type CatalogState = {
  search: string;
  brand: string;
  category: string;
  healing: HealingOption;
  sort: SortOption;
  pageSize: PageSize;
};

const orderByOptions: Record<
  SortOption,
  Prisma.ProductOrderByWithRelationInput[]
> = {
  newest: [{ createdAt: "desc" }, { id: "desc" }],
  oldest: [{ createdAt: "asc" }, { id: "asc" }],
  "name-asc": [{ name: "asc" }, { id: "asc" }],
  "name-desc": [{ name: "desc" }, { id: "desc" }],
  "price-asc": [{ price: "asc" }, { id: "asc" }],
  "price-desc": [{ price: "desc" }, { id: "desc" }],
};

function getQueryValue(value: QueryValue) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInteger(value: QueryValue, fallback: number) {
  const parsedValue = Number.parseInt(getQueryValue(value) ?? "", 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return parsedValue;
}

function getPageSize(value: QueryValue): PageSize {
  const requestedPageSize = parsePositiveInteger(value, 24);

  return PAGE_SIZES.includes(requestedPageSize as PageSize)
    ? (requestedPageSize as PageSize)
    : 24;
}

function getSort(value: QueryValue): SortOption {
  const requestedSort = getQueryValue(value);

  return SORT_OPTIONS.includes(requestedSort as SortOption)
    ? (requestedSort as SortOption)
    : "newest";
}

function getHealing(value: QueryValue): HealingOption {
  const requestedHealing = getQueryValue(value);

  return HEALING_OPTIONS.includes(requestedHealing as HealingOption)
    ? (requestedHealing as HealingOption)
    : "all";
}

function createCatalogHref(state: CatalogState, page: number) {
  const params = new URLSearchParams();

  if (state.search) params.set("search", state.search);
  if (state.brand) params.set("brand", state.brand);
  if (state.category) params.set("category", state.category);
  if (state.healing !== "all") params.set("healing", state.healing);
  if (state.sort !== "newest") params.set("sort", state.sort);
  if (state.pageSize !== 24) params.set("pageSize", String(state.pageSize));
  if (page > 1) params.set("page", String(page));

  const queryString = params.toString();
  return queryString ? `/catalog?${queryString}` : "/catalog";
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages]);

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

function getFoundLabel(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `Найдено ${count} товаров`;
  }

  if (lastDigit === 1) {
    return `Найден ${count} товар`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `Найдено ${count} товара`;
  }

  return `Найдено ${count} товаров`;
}

function getUniqueCategories(rows: { category: string }[]) {
  const categories = new Map<string, string>();

  for (const row of rows) {
    const category = row.category.trim();

    if (category) {
      const key = category.normalize("NFKC").toLocaleLowerCase("ru-RU");
      categories.set(key, categories.get(key) ?? category);
    }
  }

  return Array.from(categories.values()).sort((first, second) =>
    first.localeCompare(second, "ru-RU", { sensitivity: "base" }),
  );
}

export default async function Catalog({ searchParams }: CatalogProps) {
  const params = await searchParams;
  const search = (getQueryValue(params.search) ?? "").trim();
  const requestedBrand = (getQueryValue(params.brand) ?? "").trim();
  const requestedCategory = (getQueryValue(params.category) ?? "").trim();
  const healing = getHealing(params.healing);
  const sort = getSort(params.sort);
  const requestedPage = parsePositiveInteger(params.page, 1);
  const pageSize = getPageSize(params.pageSize ?? params.limit);

  const [brands, categoryRows] = await Promise.all([
    prisma.brand.findMany({
      where: {
        isActive: true,
        products: {
          some: {},
        },
      },
      select: {
        name: true,
        slug: true,
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    prisma.product.findMany({
      where: {
        category: {
          not: "",
        },
        brand: {
          is: {
            isActive: true,
          },
        },
      },
      select: {
        category: true,
      },
      distinct: ["category"],
    }),
  ]);

  const categories = getUniqueCategories(categoryRows);
  const brand = brands.some((item) => item.slug === requestedBrand)
    ? requestedBrand
    : "";
  const category = categories.some(
    (item) => item.localeCompare(requestedCategory, "ru-RU", {
      sensitivity: "base",
    }) === 0,
  )
    ? categories.find(
        (item) =>
          item.localeCompare(requestedCategory, "ru-RU", {
            sensitivity: "base",
          }) === 0,
      ) ?? ""
    : "";

  const where: Prisma.ProductWhereInput = {
    brand: {
      is: {
        isActive: true,
        ...(brand ? { slug: brand } : {}),
      },
    },
    ...(category
      ? {
          category: {
            equals: category,
            mode: "insensitive",
          },
        }
      : {}),
    ...(healing === "true"
      ? { healing: true }
      : healing === "false"
        ? { healing: false }
        : {}),
    ...(search
      ? {
          OR: [
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
                is: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const totalProducts = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * pageSize;

  const products = await prisma.product.findMany({
    where,
    select: {
      slug: true,
      name: true,
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
    orderBy: orderByOptions[sort],
    skip,
    take: pageSize,
  });

  const state: CatalogState = {
    search,
    brand,
    category,
    healing,
    sort,
    pageSize,
  };
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const firstProductNumber = totalProducts === 0 ? 0 : skip + 1;
  const lastProductNumber = Math.min(skip + products.length, totalProducts);
  const hasActiveParameters =
    Boolean(search || brand || category) ||
    healing !== "all" ||
    sort !== "newest" ||
    pageSize !== 24;

  return (
    <section className={styles.catalog}>
      <header className={styles.heading}>
        <h1 className={styles.title}>Каталог тайской косметики</h1>
        <p className={styles.description}>
          Оригинальная косметика из Таиланда с доставкой в Россию и страны СНГ.
        </p>
        <p className={styles.foundCount} aria-live="polite">
          {getFoundLabel(totalProducts)}
        </p>
      </header>

      <CatalogFilters
        key={[
          search,
          brand,
          category,
          healing,
          sort,
          pageSize,
        ].join("|")}
        brands={brands}
        categories={categories}
        values={state}
        showReset={hasActiveParameters}
      />

      {products.length > 0 ? (
        <>
          <div className={styles.resultsSummary}>
            Показаны товары {firstProductNumber}–{lastProductNumber} из{" "}
            {totalProducts}
          </div>

          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard
                key={product.slug}
                product={{
                  slug: product.slug,
                  name: product.name,
                  brand: product.brand.name,
                  category: product.category,
                  price: Number(product.price),
                  healing: product.healing,
                  imageUrl: product.imageUrl ?? undefined,
                }}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <nav
              className={styles.pagination}
              aria-label="Навигация по страницам каталога"
            >
              {currentPage > 1 ? (
                <Link
                  className={styles.paginationLink}
                  href={createCatalogHref(state, currentPage - 1)}
                >
                  Назад
                </Link>
              ) : (
                <span className={styles.paginationLinkDisabled} aria-disabled="true">
                  Назад
                </span>
              )}

              <span className={styles.paginationSummary}>
                Страница {currentPage} из {totalPages}
              </span>

              {visiblePages.map((pageNumber, index) => {
                const previousPage = visiblePages[index - 1];
                const showEllipsis =
                  previousPage !== undefined && pageNumber - previousPage > 1;

                return (
                  <span className={styles.pageItem} key={pageNumber}>
                    {showEllipsis ? (
                      <span className={styles.paginationEllipsis} aria-hidden="true">
                        …
                      </span>
                    ) : null}
                    <Link
                      className={
                        pageNumber === currentPage
                          ? styles.paginationLinkActive
                          : styles.paginationLink
                      }
                      href={createCatalogHref(state, pageNumber)}
                      aria-current={pageNumber === currentPage ? "page" : undefined}
                      aria-label={`Страница ${pageNumber} из ${totalPages}`}
                    >
                      {pageNumber}
                    </Link>
                  </span>
                );
              })}

              {currentPage < totalPages ? (
                <Link
                  className={styles.paginationLink}
                  href={createCatalogHref(state, currentPage + 1)}
                >
                  Вперёд
                </Link>
              ) : (
                <span className={styles.paginationLinkDisabled} aria-disabled="true">
                  Вперёд
                </span>
              )}
            </nav>
          ) : null}
        </>
      ) : (
        <div className={styles.empty}>
          <h2>Товары по заданным параметрам не найдены</h2>
          <p>Измените условия поиска или вернитесь к полному каталогу.</p>
          <Link href="/catalog" className={styles.resetButton}>
            Сбросить фильтры
          </Link>
        </div>
      )}
    </section>
  );
}
