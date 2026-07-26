import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";
import styles from "./Catalog.module.css";

export const metadata: Metadata = {
  title: "Каталог тайской косметики",
  description:
    "Каталог оригинальной тайской косметики с поиском по названию, бренду и категории.",
};

const DEFAULT_PAGE_SIZE = 24;
const ALLOWED_PAGE_SIZES = [24, 48, 96];

type CatalogProps = {
  searchParams: Promise<{
    search?: string;
    page?: string;
    limit?: string;
  }>;
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

function getPageSize(value: string | undefined) {
  const requestedPageSize = parsePositiveInteger(
    value,
    DEFAULT_PAGE_SIZE,
  );

  if (ALLOWED_PAGE_SIZES.includes(requestedPageSize)) {
    return requestedPageSize;
  }

  return DEFAULT_PAGE_SIZE;
}

function createCatalogHref({
  search,
  page,
  limit,
}: {
  search: string;
  page: number;
  limit: number;
}) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  if (limit !== DEFAULT_PAGE_SIZE) {
    params.set("limit", String(limit));
  }

  const queryString = params.toString();

  if (!queryString) {
    return "/catalog";
  }

  return `/catalog?${queryString}`;
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

export default async function Catalog({
  searchParams,
}: CatalogProps) {
  const {
    search,
    page: pageParam,
    limit: limitParam,
  } = await searchParams;

  const query = search?.trim() ?? "";
  const requestedPage = parsePositiveInteger(
    pageParam,
    1,
  );
  const pageSize = getPageSize(limitParam);

  const where = query
    ? {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
          {
            category: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
          {
            brand: {
              name: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
          },
        ],
      }
    : undefined;

  const totalProducts = await prisma.product.count({
    where,
  });

  const totalPages = Math.max(
    1,
    Math.ceil(totalProducts / pageSize),
  );

  const currentPage = Math.min(
    requestedPage,
    totalPages,
  );

  const skip = (currentPage - 1) * pageSize;

  const productsFromDb =
    await prisma.product.findMany({
      where,
      include: {
        brand: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      skip,
      take: pageSize,
    });

  const products = productsFromDb.map(
    (product) => ({
      slug: product.slug,
      name: product.name,
      brand: product.brand.name,
      price: Number(product.price),
      description: product.description,
      healing: product.healing,
      imageUrl: product.imageUrl ?? undefined,
    }),
  );

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

  return (
    <section className={styles.catalog}>
      <div className={styles.heading}>
        <span className={styles.eyebrow}>
          Более 2000 товаров
        </span>

        <h1 className={styles.title}>
          Каталог тайской косметики
        </h1>

        <p className={styles.description}>
          Найдите товар по названию, бренду или
          категории.
        </p>
      </div>

      <form
        action="/catalog"
        method="get"
        className={styles.searchForm}
      >
        <input
          className={styles.searchInput}
          type="search"
          name="search"
          defaultValue={query}
          placeholder="Например: бальзам, Wang Prom или уход за лицом"
          aria-label="Поиск товаров"
        />

        <input
          type="hidden"
          name="limit"
          value={pageSize}
        />

        <button
          className={styles.searchButton}
          type="submit"
        >
          Найти
        </button>
      </form>

      {query && (
        <div className={styles.searchResult}>
          Результаты поиска по запросу:{" "}
          <strong>«{query}»</strong>
        </div>
      )}

      {products.length > 0 ? (
        <>
          <div className={styles.toolbar}>
            <div className={styles.count}>
              Показаны товары {firstProductNumber}–
              {lastProductNumber} из {totalProducts}
            </div>

            <form
              action="/catalog"
              method="get"
              className={styles.limitForm}
            >
              {query && (
                <input
                  type="hidden"
                  name="search"
                  value={query}
                />
              )}

              <label htmlFor="catalog-limit">
                Товаров на странице:
              </label>

              <select
                id="catalog-limit"
                name="limit"
                defaultValue={pageSize}
                className={styles.limitSelect}
              >
                {ALLOWED_PAGE_SIZES.map(
                  (size) => (
                    <option
                      key={size}
                      value={size}
                    >
                      {size}
                    </option>
                  ),
                )}
              </select>

              <button
                type="submit"
                className={styles.limitButton}
              >
                Показать
              </button>
            </form>
          </div>

          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard
                key={product.slug}
                product={product}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              className={styles.pagination}
              aria-label="Навигация по страницам каталога"
            >
              {currentPage > 1 ? (
                <Link
                  className={
                    styles.paginationLink
                  }
                  href={createCatalogHref({
                    search: query,
                    page: currentPage - 1,
                    limit: pageSize,
                  })}
                >
                  ← Назад
                </Link>
              ) : (
                <span
                  className={
                    styles.paginationLinkDisabled
                  }
                >
                  ← Назад
                </span>
              )}

              {visiblePages.map(
                (pageNumber, index) => {
                  const previousPage =
                    visiblePages[index - 1];

                  const showEllipsis =
                    previousPage !== undefined &&
                    pageNumber - previousPage > 1;

                  return (
                    <span key={pageNumber}>
                      {showEllipsis && (
                        <span
                          className={
                            styles.paginationEllipsis
                          }
                        >
                          …
                        </span>
                      )}

                      <Link
                        className={
                          pageNumber === currentPage
                            ? styles.paginationLinkActive
                            : styles.paginationLink
                        }
                        href={createCatalogHref({
                          search: query,
                          page: pageNumber,
                          limit: pageSize,
                        })}
                        aria-current={
                          pageNumber === currentPage
                            ? "page"
                            : undefined
                        }
                      >
                        {pageNumber}
                      </Link>
                    </span>
                  );
                },
              )}

              {currentPage < totalPages ? (
                <Link
                  className={
                    styles.paginationLink
                  }
                  href={createCatalogHref({
                    search: query,
                    page: currentPage + 1,
                    limit: pageSize,
                  })}
                >
                  Вперёд →
                </Link>
              ) : (
                <span
                  className={
                    styles.paginationLinkDisabled
                  }
                >
                  Вперёд →
                </span>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className={styles.empty}>
          <h2>Товары не найдены</h2>

          <p>
            Измени запрос или очисти поле поиска.
          </p>

          <Link href="/catalog">
            Показать все товары
          </Link>
        </div>
      )}
    </section>
  );
}