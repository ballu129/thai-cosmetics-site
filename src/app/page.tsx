import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const databaseProducts = await prisma.product.findMany({
    include: {
      brand: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 6,
  });

  const products = databaseProducts.map((product) => ({
    slug: product.slug,
    name: product.name,
    brand: product.brand.name,
    price: Number(product.price),
    description: product.description,
    healing: product.healing,
    imageUrl: product.imageUrl ?? undefined,
  }));

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <span className="eyebrow">
              Оригинальная косметика из Таиланда
            </span>

            <h1 className="title">
              Тайский уход, которому можно доверять
            </h1>

            <p className="lead">
              Более 2000 сертифицированных товаров для красоты,
              ежедневного ухода и решения особых потребностей кожи и волос.
            </p>

            <div className={styles.actions}>
              <Link href="/catalog">
                Перейти в каталог
              </Link>

              <Link href="/healing-cosmetics">
                Лечебная косметика
              </Link>
            </div>
          </div>

          <div className={styles.visual}>
            Прямые поставки
            <br />
            из Таиланда
          </div>
        </div>
      </section>

      <section className="container">
        <span className="eyebrow">
          Популярные товары
        </span>

        <h2>
          Косметика, которую выбирают покупатели
        </h2>

        <div className="grid">
          {products.map((product) => (
            <ProductCard
              key={product.slug}
              product={product}
            />
          ))}
        </div>
      </section>

      <section className={styles.benefits}>
        <div>
          <strong>Только оригинальная продукция</strong>
          <p>
            Работаем с проверенными поставщиками и официальными брендами.
          </p>
        </div>

        <div>
          <strong>Доставка напрямую из Таиланда</strong>
          <p>
            Отправляем заказы в Россию и другие страны СНГ.
          </p>
        </div>

        <div>
          <strong>Помощь с выбором</strong>
          <p>
            Подбираем косметику с учётом индивидуальных потребностей.
          </p>
        </div>
      </section>
    </>
  );
}
