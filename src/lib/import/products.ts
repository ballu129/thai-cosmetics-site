import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  type ImportReport,
  type ImportRow,
  type ImportRowResult,
} from "./columns";
import {
  type ImportImageArchive,
  uploadImportImage,
  validateImportImage,
} from "./images";

type ProductImporterOptions = {
  dryRun: boolean;
  rows: ImportRow[];
  images: ImportImageArchive;
  prisma: PrismaClient;
};

type PreparedRow = {
  brandName: string;
  categoryName: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  activeIngredients: string[];
  healing: boolean;
  imageName: string;
  updateExisting: boolean;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parsePrice(value: string) {
  const normalizedValue = value
    .replace(/\s/g, "")
    .replace(",", ".");
  const price = Number(normalizedValue);

  return Number.isFinite(price) && price > 0
    ? price
    : null;
}

function parseBoolean(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (["да", "yes", "true", "1"].includes(normalizedValue)) {
    return true;
  }

  if (
    ["нет", "no", "false", "0", ""].includes(normalizedValue)
  ) {
    return false;
  }

  return null;
}

function parseIngredients(value: string) {
  return value
    .split(/[,;\n]/)
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);
}

function createDescription(row: ImportRow) {
  return [
    ["Краткое описание", row["Краткое описание"]],
    ["Полное описание", row["Полное описание"]],
    ["Способ применения", row["Способ применения"]],
    ["Меры предосторожности", row["Меры предосторожности"]],
    ["Состав", row["Состав"]],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n\n");
}

function transliterate(value: string) {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ы: "y",
    э: "e",
    ю: "yu",
    я: "ya",
    ъ: "",
    ь: "",
  };

  return value
    .toLowerCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("");
}

function createSlug(value: string) {
  const slug = transliterate(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

  return slug || `item-${randomUUID().slice(0, 8)}`;
}

function createRowResult({
  rowNumber,
  row,
  status,
  errors = [],
}: {
  rowNumber: number;
  row: ImportRow;
  status: ImportRowResult["status"];
  errors?: string[];
}): ImportRowResult {
  return {
    row: rowNumber,
    slug: normalizeSlug(row.Slug),
    name: row["Название"],
    status,
    errors,
  };
}

function addReportRow(
  report: ImportReport,
  rowResult: ImportRowResult,
) {
  report.rows.push(rowResult);

  if (rowResult.status === "created") {
    report.created += 1;
  }

  if (rowResult.status === "updated") {
    report.updated += 1;
  }

  if (rowResult.status === "skipped") {
    report.skipped += 1;
  }

  if (rowResult.status === "error") {
    report.errors.push(rowResult);
  }
}

async function validateRow({
  row,
  slugCounts,
  images,
}: {
  row: ImportRow;
  slugCounts: Map<string, number>;
  images: ImportImageArchive;
}) {
  const errors: string[] = [];
  const requiredFields: Array<keyof ImportRow> = [
    "Бренд",
    "Категория",
    "Название",
    "Slug",
    "Цена",
    "Краткое описание",
    "Полное описание",
    "Способ применения",
    "Меры предосторожности",
    "Состав",
    "Лечебный товар",
    "Имя изображения",
  ];

  for (const field of requiredFields) {
    if (!row[field]) {
      errors.push(`Не заполнено поле "${field}".`);
    }
  }

  const slug = normalizeSlug(row.Slug);

  if (row.Slug && !SLUG_PATTERN.test(slug)) {
    errors.push(
      "Slug должен содержать только латинские буквы, цифры и дефисы.",
    );
  }

  if (slug && (slugCounts.get(slug) ?? 0) > 1) {
    errors.push(`Slug "${slug}" повторяется внутри Excel.`);
  }

  const price = parsePrice(row["Цена"]);

  if (price === null) {
    errors.push("Цена должна быть положительным числом.");
  }

  const healing = parseBoolean(row["Лечебный товар"]);

  if (healing === null) {
    errors.push(
      "Поле \"Лечебный товар\" должно быть Да/Нет, YES/NO, true/false или 1/0.",
    );
  }

  const updateExisting = parseBoolean(
    row["Обновлять существующий товар"],
  );

  if (updateExisting === null) {
    errors.push(
      "Поле \"Обновлять существующий товар\" должно быть Да/Нет, YES/NO, true/false, 1/0 или пустым.",
    );
  }

  if (row["Имя изображения"]) {
    const imageError = await validateImportImage(
      row["Имя изображения"],
      images,
    );

    if (imageError) {
      errors.push(imageError);
    }
  }

  if (errors.length > 0) {
    return {
      success: false as const,
      errors,
    };
  }

  return {
    success: true as const,
    data: {
      brandName: row["Бренд"],
      categoryName: row["Категория"],
      name: row["Название"],
      slug,
      price: price!,
      description: createDescription(row),
      activeIngredients: parseIngredients(
        row["Активные ингредиенты"],
      ),
      healing: healing!,
      imageName: row["Имя изображения"],
      updateExisting: updateExisting ?? false,
    } satisfies PreparedRow,
  };
}

async function findOrCreateBrand({
  prisma,
  name,
}: {
  prisma: PrismaClient;
  name: string;
}) {
  const existingBrand = await prisma.brand.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existingBrand) {
    return existingBrand;
  }

  return prisma.brand.create({
    data: {
      name,
      slug: `${createSlug(name)}-${randomUUID().slice(0, 8)}`,
      description: null,
      logoUrl: null,
      websiteUrl: null,
      isActive: true,
    },
  });
}

async function findOrCreateCategory({
  prisma,
  name,
}: {
  prisma: PrismaClient;
  name: string;
}) {
  const existingCategory = await prisma.category.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existingCategory) {
    return existingCategory;
  }

  return prisma.category.create({
    data: {
      name,
      slug: `${createSlug(name)}-${randomUUID().slice(0, 8)}`,
      description: null,
      isActive: true,
    },
  });
}

function createEmptyReport(dryRun: boolean, totalRows: number) {
  return {
    dryRun,
    totalRows,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    rows: [],
  } satisfies ImportReport;
}

export async function runProductImport({
  dryRun,
  rows,
  images,
  prisma,
}: ProductImporterOptions) {
  const report = createEmptyReport(dryRun, rows.length);
  const slugCounts = new Map<string, number>();

  for (const row of rows) {
    const slug = normalizeSlug(row.Slug);

    if (slug) {
      slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
    }
  }

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const validation = await validateRow({
      row,
      slugCounts,
      images,
    });

    if (!validation.success) {
      addReportRow(
        report,
        createRowResult({
          rowNumber,
          row,
          status: "error",
          errors: validation.errors,
        }),
      );
      continue;
    }

    const data = validation.data;
    const existingProduct = await prisma.product.findUnique({
      where: {
        slug: data.slug,
      },
      select: {
        id: true,
      },
    });

    if (existingProduct && !data.updateExisting) {
      addReportRow(
        report,
        createRowResult({
          rowNumber,
          row,
          status: "skipped",
        }),
      );
      continue;
    }

    const status = existingProduct ? "updated" : "created";

    if (dryRun) {
      addReportRow(
        report,
        createRowResult({
          rowNumber,
          row,
          status,
        }),
      );
      continue;
    }

    try {
      const [brand, category, imageUrl] = await Promise.all([
        findOrCreateBrand({
          prisma,
          name: data.brandName,
        }),
        findOrCreateCategory({
          prisma,
          name: data.categoryName,
        }),
        uploadImportImage(data.imageName, images),
      ]);

      if (existingProduct) {
        await prisma.product.update({
          where: {
            id: existingProduct.id,
          },
          data: {
            name: data.name,
            slug: data.slug,
            brandId: brand.id,
            category: category.name,
            categoryId: category.id,
            price: data.price,
            description: data.description,
            healing: data.healing,
            activeIngredients: data.activeIngredients,
            imageUrl,
          },
        });
      } else {
        await prisma.product.create({
          data: {
            name: data.name,
            slug: data.slug,
            brandId: brand.id,
            category: category.name,
            categoryId: category.id,
            price: data.price,
            description: data.description,
            healing: data.healing,
            activeIngredients: data.activeIngredients,
            imageUrl,
          },
        });
      }

      addReportRow(
        report,
        createRowResult({
          rowNumber,
          row,
          status,
        }),
      );
    } catch (error) {
      addReportRow(
        report,
        createRowResult({
          rowNumber,
          row,
          status: "error",
          errors: [
            error instanceof Error
              ? error.message
              : "Не удалось импортировать строку.",
          ],
        }),
      );
    }
  }

  return report;
}
