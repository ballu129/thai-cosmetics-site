import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  WHOLESALE_REQUEST_STATUSES,
  type WholesaleRequestStatusValue,
  wholesaleBusinessTypeLabels,
  wholesaleStatusLabels,
} from "@/lib/wholesale";
import styles from "./wholesale-orders.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Оптовые заявки",
};

const PAGE_SIZES = [20, 50, 100] as const;
const SORT_OPTIONS = ["date-desc", "date-asc", "name-asc", "name-desc"] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type SortOption = (typeof SORT_OPTIONS)[number];

const sortLabels: Record<SortOption, string> = {
  "date-desc": "Сначала новые",
  "date-asc": "Сначала старые",
  "name-asc": "По имени А–Я",
  "name-desc": "По имени Я–А",
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "short",
});

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getPositiveInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages]);
  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }
  return Array.from(pages).sort((first, second) => first - second);
}

export default async function WholesaleOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = getParam(params.search).normalize("NFKC").trim().slice(0, 200);
  const rawStatus = getParam(params.status);
  const status = WHOLESALE_REQUEST_STATUSES.includes(
    rawStatus as WholesaleRequestStatusValue,
  )
    ? (rawStatus as WholesaleRequestStatusValue)
    : "ALL";
  const rawSort = getParam(params.sort);
  const sort: SortOption = SORT_OPTIONS.includes(rawSort as SortOption)
    ? (rawSort as SortOption)
    : "date-desc";
  const requestedPageSize = getPositiveInteger(getParam(params.pageSize), 20);
  const pageSize = PAGE_SIZES.includes(requestedPageSize as (typeof PAGE_SIZES)[number])
    ? requestedPageSize
    : 20;

  const where: Prisma.WholesaleRequestWhereInput = {
    ...(status !== "ALL" ? { status } : {}),
    ...(search
      ? {
          OR: [
            { contactName: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { country: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.WholesaleRequestOrderByWithRelationInput[] =
    sort === "date-asc"
      ? [{ createdAt: "asc" }, { id: "asc" }]
      : sort === "name-asc"
        ? [{ contactName: "asc" }, { id: "asc" }]
        : sort === "name-desc"
          ? [{ contactName: "desc" }, { id: "desc" }]
          : [{ createdAt: "desc" }, { id: "desc" }];

  const totalItems = await prisma.wholesaleRequest.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const requestedPage = getPositiveInteger(getParam(params.page), 1);
  const page = Math.min(requestedPage, totalPages);

  const requests = await prisma.wholesaleRequest.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      createdAt: true,
      contactName: true,
      companyName: true,
      phone: true,
      email: true,
      country: true,
      city: true,
      businessType: true,
      expectedVolume: true,
      status: true,
    },
  });

  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);
  const hasActiveFilters = Boolean(search) || status !== "ALL" || sort !== "date-desc" || pageSize !== 20;

  function createPageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status !== "ALL") query.set("status", status);
    if (sort !== "date-desc") query.set("sort", sort);
    if (pageSize !== 20) query.set("pageSize", String(pageSize));
    if (nextPage > 1) query.set("page", String(nextPage));
    const queryString = query.toString();
    return queryString ? `/admin/wholesale-orders?${queryString}` : "/admin/wholesale-orders";
  }

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <Link href="/admin" className={styles.backLink}>← В панель управления</Link>
          <h1>Оптовые заявки</h1>
          <p>Обработка обращений от магазинов, салонов и других оптовых клиентов.</p>
        </div>
      </header>

      <form action="/admin/wholesale-orders" method="get" className={styles.filterPanel}>
        <input type="hidden" name="page" value="1" />
        <label className={styles.field}>
          <span>Поиск</span>
          <input type="search" name="search" defaultValue={search} placeholder="Имя, компания, телефон, email, регион" />
        </label>
        <label className={styles.field}>
          <span>Статус</span>
          <select name="status" defaultValue={status}>
            <option value="ALL">Все статусы</option>
            {WHOLESALE_REQUEST_STATUSES.map((item) => <option key={item} value={item}>{wholesaleStatusLabels[item]}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>Сортировка</span>
          <select name="sort" defaultValue={sort}>
            {SORT_OPTIONS.map((item) => <option key={item} value={item}>{sortLabels[item]}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>На странице</span>
          <select name="pageSize" defaultValue={pageSize}>
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <div className={styles.filterActions}>
          <button type="submit" className={styles.primaryButton}>Применить</button>
          {hasActiveFilters ? <Link href="/admin/wholesale-orders" className={styles.secondaryButton}>Сбросить фильтры</Link> : null}
        </div>
      </form>

      <p className={styles.resultsSummary}>
        Найдено заявок: {totalItems}. Показаны {firstItem}–{lastItem}.
      </p>

      {requests.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Оптовые заявки по заданным параметрам не найдены.</p>
          <Link href="/admin/wholesale-orders" className={styles.secondaryButton}>Сбросить фильтры</Link>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead><tr><th>Дата</th><th>Контакт</th><th>Компания</th><th>Телефон</th><th>Email</th><th>Регион</th><th>Тип бизнеса</th><th>Планируемый объём</th><th>Статус</th><th>Действия</th></tr></thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item.id}>
                  <td className={styles.nowrap}>{dateFormatter.format(item.createdAt)}</td>
                  <td className={styles.wrap}>{item.contactName}</td>
                  <td className={styles.wrap}>{item.companyName || "Не указана"}</td>
                  <td className={styles.nowrap}><a href={`tel:${item.phone}`}>{item.phone}</a></td>
                  <td className={styles.wrap}><a href={`mailto:${item.email}`}>{item.email}</a></td>
                  <td className={styles.wrap}>{item.country}, {item.city}</td>
                  <td className={styles.wrap}>{item.businessType ? wholesaleBusinessTypeLabels[item.businessType] ?? "Другое" : "Не указан"}</td>
                  <td className={styles.wrap}>{item.expectedVolume}</td>
                  <td><span className={styles.statusBadge}>{wholesaleStatusLabels[item.status]}</span></td>
                  <td><Link href={`/admin/wholesale-orders/${item.id}`} className={styles.openLink}>Открыть</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="Страницы оптовых заявок">
          {page > 1 ? <Link href={createPageHref(page - 1)} className={styles.pageLink}>Назад</Link> : null}
          {visiblePages.map((pageNumber, index) => {
            const previous = visiblePages[index - 1];
            return <span key={pageNumber} className={styles.paginationItem}>
              {previous !== undefined && pageNumber - previous > 1 ? <span>…</span> : null}
              <Link href={createPageHref(pageNumber)} className={pageNumber === page ? styles.currentPage : styles.pageLink} aria-current={pageNumber === page ? "page" : undefined}>{pageNumber}</Link>
            </span>;
          })}
          {page < totalPages ? <Link href={createPageHref(page + 1)} className={styles.pageLink}>Вперёд</Link> : null}
        </nav>
      ) : null}
    </main>
  );
}
