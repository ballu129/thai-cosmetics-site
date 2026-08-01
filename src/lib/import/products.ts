import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { isVercelBlobUrl } from "@/lib/blob-url";
import {
  type ExistingProductMode,
  type ImportReport,
  type ImportRow,
  type ImportRowResult,
} from "./columns";
import {
  isSupportedImageName,
  type ImportImageArchive,
  uploadImportImage,
  validateImportImage,
} from "./images";

type ProductImporterOptions = {
  dryRun: boolean;
  existingProductMode: ExistingProductMode;
  createMissingBrands: boolean;
  rows: ImportRow[];
  images: ImportImageArchive;
  prisma: PrismaClient;
};

type ExistingProduct = {
  id: string;
  slug: string;
};

type ExistingBrand = {
  id: string;
  name: string;
};

type ExistingCategory = {
  id: string;
  name: string;
};

type ImageSource =
  | {
      type: "empty";
      value: null;
    }
  | {
      type: "direct";
      value: string;
    }
  | {
      type: "archive";
      value: string;
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
  imageSource: ImageSource;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PUBLIC_PRODUCT_IMAGE_PATH_PATTERN =
  /^\/products\/[A-Za-z0-9][A-Za-z0-9._/-]*\.(?:jpe?g|png|webp)$/i;

const MAX_NAME_LENGTH = 220;
const MAX_SLUG_LENGTH = 160;
const MAX_BRAND_LENGTH = 160;
const MAX_CATEGORY_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 15000;
const MAX_IMAGE_URL_LENGTH = 1000;
const MAX_INGREDIENTS = 50;
const MAX_INGREDIENT_LENGTH = 160;

function normalizeKey(value: string) {
  return value.normalize("NFKC").trim().toLowerCase();
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parsePrice(value: string) {
  const normalizedValue = value.replace(/\s/g, "").replace(",", ".");
  const price = Number(normalizedValue);

  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    price > 9999999999.99
  ) {
    return null;
  }

  return Math.round(price * 100) / 100;
}

function parseBoolean(value: string) {
  const normalizedValue = normalizeKey(value);

  if (["да", "yes", "true", "1"].includes(normalizedValue)) {
    return true;
  }

  if (["нет", "no", "false", "0", ""].includes(normalizedValue)) {
    return false;
  }

  return null;
}

function parseIngredients(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      success: true as const,
      ingredients: [],
    };
  }

  let ingredients: string[];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;

      if (
        !Array.isArray(parsed) ||
        parsed.some((item) => typeof item !== "string")
      ) {
        return {
          success: false as const,
          error:
            "activeIngredients в JSON-формате должен быть массивом строк.",
        };
      }

      ingredients = parsed;
    } catch {
      return {
        success: false as const,
        error:
          "activeIngredients содержит некорректный JSON. Используйте список через запятую или JSON-массив строк.",
      };
    }
  } else {
    ingredients = trimmed.split(/[,;\n]/);
  }

  const normalizedIngredients = ingredients
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);

  if (normalizedIngredients.length > MAX_INGREDIENTS) {
    return {
      success: false as const,
      error: `activeIngredients не должен содержать больше ${MAX_INGREDIENTS} значений.`,
    };
  }

  const longIngredient = normalizedIngredients.find(
    (ingredient) => ingredient.length > MAX_INGREDIENT_LENGTH,
  );

  if (longIngredient) {
    return {
      success: false as const,
      error: `Ингредиент "${longIngredient}" слишком длинный.`,
    };
  }

  return {
    success: true as const,
    ingredients: normalizedIngredients,
  };
}

function isPublicProductImagePath(value: string) {
  return (
    PUBLIC_PRODUCT_IMAGE_PATH_PATTERN.test(value) &&
    !value.includes("..") &&
    !value.includes("//") &&
    !value.includes("\\")
  );
}

async function validateImageSource(
  imageUrl: string,
  images: ImportImageArchive,
) {
  const value = imageUrl.trim();

  if (!value) {
    return {
      success: true as const,
      imageSource: {
        type: "empty",
        value: null,
      } satisfies ImageSource,
    };
  }

  if (value.length > MAX_IMAGE_URL_LENGTH) {
    return {
      success: false as const,
      error: `imageUrl не должен быть длиннее ${MAX_IMAGE_URL_LENGTH} символов.`,
    };
  }

  if (isVercelBlobUrl(value) || isPublicProductImagePath(value)) {
    return {
      success: true as const,
      imageSource: {
        type: "direct",
        value,
      } satisfies ImageSource,
    };
  }

  if (/^https?:\/\//i.test(value)) {
    return {
      success: false as const,
      error:
        "imageUrl может быть только ссылкой Vercel Blob, локальным путём /products/*.jpg|png|webp или именем файла из ZIP-архива.",
    };
  }

  if (isSupportedImageName(value)) {
    const imageError = await validateImportImage(value, images);

    if (imageError) {
      return {
        success: false as const,
        error: imageError,
      };
    }

    return {
      success: true as const,
      imageSource: {
        type: "archive",
        value,
      } satisfies ImageSource,
    };
  }

  return {
    success: false as const,
    error:
      "imageUrl должен быть ссылкой Vercel Blob, путём /products/*.jpg|png|webp или именем файла из ZIP-архива.",
  };
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

function createRowResult({
  rowNumber,
  row,
  slug,
  status,
  action,
  errors = [],
  brandMissing = false,
  productExists = false,
}: {
  rowNumber: number;
  row: ImportRow;
  slug: string;
  status: ImportRowResult["status"];
  action: ImportRowResult["action"];
  errors?: string[];
  brandMissing?: boolean;
  productExists?: boolean;
}): ImportRowResult {
  return {
    row: rowNumber,
    name: row.name,
    slug,
    brand: row.brand,
    category: row.category,
    price: row.price,
    action,
    status,
    errors,
    brandMissing,
    productExists,
  };
}

function addReportRow(report: ImportReport, rowResult: ImportRowResult) {
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

function getSafeRowErrorMessage(error: unknown) {
  const fallback = "Не удалось импортировать строку.";

  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  if (
    /prisma|database_url|blob_read_write_token|vercel_oidc_token|auth_secret|invalid `/i.test(
      error.message,
    )
  ) {
    return fallback;
  }

  return error.message;
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
  const name = row.name.trim();
  const slug = normalizeSlug(row.slug);
  const brandName = row.brand.trim();
  const categoryName = row.category.trim();
  const description = row.description.trim();

  if (!name) {
    errors.push("Не заполнено название товара.");
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.push(`Название не должно быть длиннее ${MAX_NAME_LENGTH} символов.`);
  }

  if (!slug) {
    errors.push("Не заполнен slug товара.");
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.push(
      "Slug должен содержать только латинские буквы, цифры и одиночные дефисы.",
    );
  } else if (slug.length > MAX_SLUG_LENGTH) {
    errors.push(`Slug не должен быть длиннее ${MAX_SLUG_LENGTH} символов.`);
  } else if ((slugCounts.get(slug) ?? 0) > 1) {
    errors.push(`Slug "${slug}" повторяется внутри файла.`);
  }

  if (!brandName) {
    errors.push("Не заполнен бренд.");
  } else if (brandName.length > MAX_BRAND_LENGTH) {
    errors.push(`Бренд не должен быть длиннее ${MAX_BRAND_LENGTH} символов.`);
  }

  if (!categoryName) {
    errors.push("Не заполнена категория.");
  } else if (categoryName.length > MAX_CATEGORY_LENGTH) {
    errors.push(
      `Категория не должна быть длиннее ${MAX_CATEGORY_LENGTH} символов.`,
    );
  }

  if (!description) {
    errors.push("Не заполнено описание.");
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `Описание не должно быть длиннее ${MAX_DESCRIPTION_LENGTH} символов.`,
    );
  }

  const price = parsePrice(row.price);

  if (price === null) {
    errors.push("Цена должна быть положительным числом.");
  }

  const healing = parseBoolean(row.healing);

  if (healing === null) {
    errors.push(
      "healing должен быть Да/Нет, YES/NO, true/false или 1/0.",
    );
  }

  const ingredients = parseIngredients(row.activeIngredients);

  if (!ingredients.success) {
    errors.push(ingredients.error);
  }

  const imageSource = await validateImageSource(row.imageUrl, images);

  if (!imageSource.success) {
    errors.push(imageSource.error);
  }

  if (errors.length > 0) {
    return {
      success: false as const,
      slug,
      errors,
    };
  }

  if (
    price === null ||
    healing === null ||
    !ingredients.success ||
    !imageSource.success
  ) {
    return {
      success: false as const,
      slug,
      errors: ["Строка не прошла проверку."],
    };
  }

  return {
    success: true as const,
    data: {
      brandName,
      categoryName,
      name,
      slug,
      price,
      description,
      activeIngredients: ingredients.ingredients,
      healing,
      imageSource: imageSource.imageSource,
    } satisfies PreparedRow,
  };
}

async function createUniqueBrandSlug(
  prisma: PrismaClient,
  brandName: string,
) {
  const baseSlug = createSlug(brandName);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${randomUUID().slice(0, 8)}`;
    const slug = `${baseSlug}${suffix}`;
    const existing = await prisma.brand.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }
  }

  return `${baseSlug}-${randomUUID().slice(0, 12)}`;
}

async function resolveImageUrl(
  imageSource: ImageSource,
  images: ImportImageArchive,
) {
  if (imageSource.type === "empty") {
    return null;
  }

  if (imageSource.type === "direct") {
    return imageSource.value;
  }

  return uploadImportImage(imageSource.value, images);
}

export async function runProductImport({
  dryRun,
  existingProductMode,
  createMissingBrands,
  rows,
  images,
  prisma,
}: ProductImporterOptions) {
  const report = createEmptyReport(dryRun, rows.length);
  const slugCounts = new Map<string, number>();

  for (const row of rows) {
    const slug = normalizeSlug(row.slug);

    if (slug) {
      slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
    }
  }

  const normalizedSlugs = Array.from(slugCounts.keys());
  const [existingProducts, existingBrands, existingCategories] =
    await Promise.all([
      normalizedSlugs.length > 0
        ? prisma.product.findMany({
            where: {
              slug: {
                in: normalizedSlugs,
              },
            },
            select: {
              id: true,
              slug: true,
            },
          })
        : Promise.resolve([]),
      prisma.brand.findMany({
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

  const productsBySlug = new Map<string, ExistingProduct>(
    existingProducts.map((product) => [product.slug, product]),
  );
  const brandsByName = new Map<string, ExistingBrand>(
    existingBrands.map((brand) => [normalizeKey(brand.name), brand]),
  );
  const categoriesByName = new Map<string, ExistingCategory>(
    existingCategories.map((category) => [
      normalizeKey(category.name),
      category,
    ]),
  );

  const preparedRows: Array<{
    rowNumber: number;
    row: ImportRow;
    data: PreparedRow;
    action: "create" | "update";
    brandMissing: boolean;
    productExists: boolean;
  }> = [];

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
          slug: validation.slug,
          status: "error",
          action: "error",
          errors: validation.errors,
        }),
      );
      continue;
    }

    const data = validation.data;
    const existingProduct = productsBySlug.get(data.slug);
    const productExists = Boolean(existingProduct);
    const brandMissing = !brandsByName.has(normalizeKey(data.brandName));

    if (brandMissing && !createMissingBrands) {
      addReportRow(
        report,
        createRowResult({
          rowNumber,
          row,
          slug: data.slug,
          status: "error",
          action: "error",
          errors: [
            `Бренд "${data.brandName}" не найден. Включите создание отсутствующих брендов или создайте бренд заранее.`,
          ],
          brandMissing,
          productExists,
        }),
      );
      continue;
    }

    if (existingProduct && existingProductMode === "skip") {
      addReportRow(
        report,
        createRowResult({
          rowNumber,
          row,
          slug: data.slug,
          status: "skipped",
          action: "skip",
          brandMissing,
          productExists,
        }),
      );
      continue;
    }

    const action = existingProduct ? "update" : "create";

    if (dryRun) {
      addReportRow(
        report,
        createRowResult({
          rowNumber,
          row,
          slug: data.slug,
          status: existingProduct ? "updated" : "created",
          action,
          brandMissing,
          productExists,
        }),
      );
      continue;
    }

    preparedRows.push({
      rowNumber,
      row,
      data,
      action,
      brandMissing,
      productExists,
    });
  }

  if (dryRun) {
    return report;
  }

  for (const preparedRow of preparedRows) {
    const { rowNumber, row, data } = preparedRow;

    try {
      const imageUrl = await resolveImageUrl(data.imageSource, images);

      const result = await prisma.$transaction(async (tx) => {
        const existingProduct = await tx.product.findUnique({
          where: {
            slug: data.slug,
          },
          select: {
            id: true,
          },
        });

        if (existingProduct && existingProductMode === "skip") {
          return "skipped" as const;
        }

        let brand = await tx.brand.findFirst({
          where: {
            name: {
              equals: data.brandName,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
          },
        });

        if (!brand) {
          if (!createMissingBrands) {
            throw new Error(
              `Бренд "${data.brandName}" не найден. Создание брендов выключено.`,
            );
          }

          brand = await tx.brand.create({
            data: {
              name: data.brandName,
              slug: await createUniqueBrandSlug(prisma, data.brandName),
              description: null,
              logoUrl: null,
              websiteUrl: null,
              isActive: true,
            },
            select: {
              id: true,
            },
          });
        }

        const category = categoriesByName.get(
          normalizeKey(data.categoryName),
        );

        const productData = {
          name: data.name,
          slug: data.slug,
          brandId: brand.id,
          category: category?.name ?? data.categoryName,
          categoryId: category?.id ?? null,
          price: data.price,
          description: data.description,
          healing: data.healing,
          activeIngredients: data.activeIngredients,
          imageUrl,
        };

        if (existingProduct) {
          await tx.product.update({
            where: {
              id: existingProduct.id,
            },
            data: productData,
          });

          return "updated" as const;
        }

        await tx.product.create({
          data: productData,
        });

        return "created" as const;
      });

      addReportRow(
        report,
        createRowResult({
          rowNumber,
          row,
          slug: data.slug,
          status: result,
          action:
            result === "skipped"
              ? "skip"
              : result === "updated"
                ? "update"
                : "create",
          brandMissing: preparedRow.brandMissing,
          productExists: preparedRow.productExists,
        }),
      );
    } catch (error) {
      addReportRow(
        report,
        createRowResult({
          rowNumber,
          row,
          slug: data.slug,
          status: "error",
          action: "error",
          errors: [getSafeRowErrorMessage(error)],
          brandMissing: preparedRow.brandMissing,
          productExists: preparedRow.productExists,
        }),
      );
    }
  }

  return report;
}
