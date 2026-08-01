import { isVercelBlobUrl } from "@/lib/blob-url";

const PUBLIC_PRODUCT_IMAGE_PATH_PATTERN =
  /^\/products\/[A-Za-z0-9][A-Za-z0-9._/-]*\.(?:jpe?g|png|webp)$/i;

type ProductInput = {
  name: string;
  slug: string;
  brandId: string;
  categoryId: string | null;
  category: string | null;
  price: number;
  description: string;
  healing: boolean;
  activeIngredients: string[];
  imageUrl: string | null;
};

type ProductInputResult =
  | {
      success: true;
      data: ProductInput;
    }
  | {
      success: false;
      error: string;
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRequiredString(
  body: Record<string, unknown>,
  field: string,
) {
  const value = body[field];

  return typeof value === "string" ? value.trim() : "";
}

function isPublicProductImagePath(value: string) {
  return (
    PUBLIC_PRODUCT_IMAGE_PATH_PATTERN.test(value) &&
    !value.includes("..") &&
    !value.includes("//") &&
    !value.includes("\\")
  );
}

export function validateProductInput(
  body: unknown,
): ProductInputResult {
  if (!isObject(body)) {
    return {
      success: false,
      error: "Переданы некорректные данные товара.",
    };
  }

  const name = readRequiredString(body, "name");
  const slug = readRequiredString(body, "slug");
  const brandId = readRequiredString(body, "brandId");
  const categoryId = readRequiredString(body, "categoryId");
  const category = readRequiredString(body, "category");
  const description = readRequiredString(body, "description");

  if (
    !name ||
    !slug ||
    !brandId ||
    (!categoryId && !category) ||
    !description
  ) {
    return {
      success: false,
      error: "Заполните все обязательные поля товара.",
    };
  }

  if (
    typeof body.price !== "number" ||
    !Number.isFinite(body.price) ||
    body.price <= 0
  ) {
    return {
      success: false,
      error: "Укажите корректную цену товара.",
    };
  }

  if (typeof body.healing !== "boolean") {
    return {
      success: false,
      error: "Передан некорректный признак лечебного товара.",
    };
  }

  if (
    !Array.isArray(body.activeIngredients) ||
    body.activeIngredients.some(
      (ingredient) => typeof ingredient !== "string",
    )
  ) {
    return {
      success: false,
      error: "Передан некорректный список активных ингредиентов.",
    };
  }

  if (
    body.imageUrl !== null &&
    body.imageUrl !== undefined &&
    typeof body.imageUrl !== "string"
  ) {
    return {
      success: false,
      error: "Передан некорректный путь к изображению.",
    };
  }

  const imageUrl =
    typeof body.imageUrl === "string"
      ? body.imageUrl.trim()
      : "";

  if (
    imageUrl &&
    !isVercelBlobUrl(imageUrl) &&
    !isPublicProductImagePath(imageUrl)
  ) {
    return {
      success: false,
      error:
        "Изображение товара должно быть ссылкой Vercel Blob или путём /products/*.jpg, /products/*.png, /products/*.webp.",
    };
  }

  return {
    success: true,
    data: {
      name,
      slug,
      brandId,
      categoryId: categoryId || null,
      category: category || null,
      price: body.price,
      description,
      healing: body.healing,
      activeIngredients: body.activeIngredients
        .map((ingredient) => ingredient.trim())
        .filter(Boolean),
      imageUrl: imageUrl || null,
    },
  };
}
