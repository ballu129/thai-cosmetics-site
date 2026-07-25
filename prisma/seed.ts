import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();

  const wangProm = await prisma.brand.create({
    data: {
      name: "Wang Prom",
      slug: "wang-prom",
    },
  });

  const thaiNature = await prisma.brand.create({
    data: {
      name: "Thai Nature",
      slug: "thai-nature",
    },
  });

  const khaolaor = await prisma.brand.create({
    data: {
      name: "Khaolaor",
      slug: "khaolaor",
    },
  });

  await prisma.product.createMany({
    data: [
      {
        slug: "herbal-balm-wang-prom",
        name: "Тайский травяной бальзам Wang Prom",
        category: "Тайские бальзамы",
        price: 1290,
        description:
          "Травяной косметический бальзам для массажа и ухода за кожей.",
        healing: true,
        activeIngredients: ["ментол", "камфора", "тайские травы"],
        imageUrl: "/products/wang-prom-yellow.jpg",
        brandId: wangProm.id,
      },
      {
        slug: "snail-repair-cream",
        name: "Восстанавливающий крем с муцином улитки",
        category: "Уход за лицом",
        price: 1890,
        description:
          "Крем для ежедневного ухода, увлажнения и восстановления защитного барьера кожи.",
        healing: false,
        activeIngredients: [
          "муцин улитки",
          "ниацинамид",
          "гиалуроновая кислота",
        ],
        imageUrl: "/products/snail-cream-real.jpg",
        brandId: thaiNature.id,
      },
      {
        slug: "herbal-anti-dandruff-shampoo",
        name: "Травяной шампунь против перхоти",
        category: "Уход за волосами",
        price: 1490,
        description:
          "Косметический шампунь для ухода за кожей головы, склонной к шелушению.",
        healing: true,
        activeIngredients: ["имбирь", "каффир-лайм", "алоэ вера"],
        imageUrl: "/products/khaolaor-shampoo.jpg",
        brandId: khaolaor.id,
      },
    ],
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });