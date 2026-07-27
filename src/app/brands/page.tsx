import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <section className="container">
      <span className="eyebrow">Бренды из Таиланда</span>

      <h1 className="pageTitle">Бренды тайской косметики</h1>

      <p className="lead">
        В каталоге представлены бренды, загруженные из PostgreSQL через Prisma.
      </p>

      <div className="grid">
        {brands.map((brand) => (
          <article key={brand.id}>
            <h2>{brand.name}</h2>

            {brand.description && <p>{brand.description}</p>}

            <Link href={`/brands/${encodeURIComponent(brand.slug)}`}>
              Посмотреть товары
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
