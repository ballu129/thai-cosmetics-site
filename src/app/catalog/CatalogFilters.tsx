"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import styles from "./Catalog.module.css";

type CatalogFiltersProps = {
  brands: { name: string; slug: string }[];
  categories: string[];
  values: {
    search: string;
    brand: string;
    category: string;
    healing: "all" | "true" | "false";
    sort:
      | "newest"
      | "oldest"
      | "name-asc"
      | "name-desc"
      | "price-asc"
      | "price-desc";
    pageSize: 24 | 48 | 96;
  };
  showReset: boolean;
};

export default function CatalogFilters({
  brands,
  categories,
  values,
  showReset,
}: CatalogFiltersProps) {
  const router = useRouter();

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const search = String(formData.get("search") ?? "").trim();
    const brand = String(formData.get("brand") ?? "");
    const category = String(formData.get("category") ?? "");
    const healing = String(formData.get("healing") ?? "all");
    const sort = String(formData.get("sort") ?? "newest");
    const pageSize = String(formData.get("pageSize") ?? "24");

    if (search) params.set("search", search);
    if (brand) params.set("brand", brand);
    if (category) params.set("category", category);
    if (healing !== "all") params.set("healing", healing);
    if (sort !== "newest") params.set("sort", sort);
    if (pageSize !== "24") params.set("pageSize", pageSize);

    const queryString = params.toString();
    router.push(queryString ? `/catalog?${queryString}` : "/catalog");
  }

  return (
    <form className={styles.filterPanel} onSubmit={applyFilters}>
      <label className={`${styles.field} ${styles.searchField}`}>
        <span>Поиск</span>
        <input
          className={styles.control}
          type="search"
          name="search"
          defaultValue={values.search}
          placeholder="Название, slug, бренд или категория"
        />
      </label>

      <label className={styles.field}>
        <span>Бренд</span>
        <select className={styles.control} name="brand" defaultValue={values.brand}>
          <option value="">Все бренды</option>
          {brands.map((brand) => (
            <option key={brand.slug} value={brand.slug}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Категория</span>
        <select
          className={styles.control}
          name="category"
          defaultValue={values.category}
        >
          <option value="">Все категории</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Тип товара</span>
        <select className={styles.control} name="healing" defaultValue={values.healing}>
          <option value="all">Все товары</option>
          <option value="true">Лечебная косметика</option>
          <option value="false">Обычная косметика</option>
        </select>
      </label>

      <label className={styles.field}>
        <span>Сортировка</span>
        <select className={styles.control} name="sort" defaultValue={values.sort}>
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
          <option value="name-asc">Название: А–Я</option>
          <option value="name-desc">Название: Я–А</option>
          <option value="price-asc">Цена: по возрастанию</option>
          <option value="price-desc">Цена: по убыванию</option>
        </select>
      </label>

      <label className={styles.field}>
        <span>На странице</span>
        <select
          className={styles.control}
          name="pageSize"
          defaultValue={values.pageSize}
        >
          <option value="24">24</option>
          <option value="48">48</option>
          <option value="96">96</option>
        </select>
      </label>

      <div className={styles.filterActions}>
        <button className={styles.applyButton} type="submit">
          Применить
        </button>
        {showReset ? (
          <Link
            className={styles.resetButton}
            href="/catalog"
          >
            Сбросить фильтры
          </Link>
        ) : null}
      </div>
    </form>
  );
}
