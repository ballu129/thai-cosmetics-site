import { randomUUID } from "node:crypto";
import path from "node:path";
import { put } from "@vercel/blob";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_TABLE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 500;

const requiredColumns = [
  "Бренд",
  "Категория",
  "Название",
  "Цена",
  "Краткое описание",
  "Полное описание",
  "Активные ингредиенты",
  "Способ применения",
  "Меры предосторожности",
  "Состав",
  "Лечебный товар (да/нет)",
  "Имя изображения",
] as const;

const imageContentTypes = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);

type ImportColumn = (typeof requiredColumns)[number];
type ImportRow = Record<ImportColumn, string>;

type RowError = {
  row: number;
  name?: string;
  errors: string[];
};

type ImportReport = {
  imported: number;
  updated: number;
  errors: RowError[];
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();
}

function normalizeValue(value: unknown) {
  return String(value ?? "").trim();
}

function decodeXml(value: string) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function readXmlTexts(xml: string) {
  const texts: string[] = [];
  const textPattern = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let match: RegExpExecArray | null;

  while ((match = textPattern.exec(xml)) !== null) {
    texts.push(decodeXml(match[1]));
  }

  return texts.join("");
}

function getCellColumnIndex(cellReference: string) {
  const columnLetters =
    cellReference.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? "";
  let index = 0;

  for (const letter of columnLetters) {
    index =
      index * 26 + letter.charCodeAt(0) - "A".charCodeAt(0) + 1;
  }

  return Math.max(index - 1, 0);
}

function readCellAttributes(cellXml: string) {
  const attributes = new Map<string, string>();
  const openingTag = cellXml.match(/^<c\s+([^>]*)>/)?.[1] ?? "";
  const attributePattern = /([A-Za-z_:]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(openingTag)) !== null) {
    attributes.set(match[1], decodeXml(match[2]));
  }

  return attributes;
}

async function parseXlsxRows(arrayBuffer: ArrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const sheetFile = zip.file("xl/worksheets/sheet1.xml");

  if (!sheetFile) {
    throw new Error(
      "В Excel-файле не найден первый лист.",
    );
  }

  const sharedStringsXml =
    await zip.file("xl/sharedStrings.xml")?.async("string");
  const sharedStrings: string[] = [];

  if (sharedStringsXml) {
    const sharedStringPattern = /<si(?:\s[^>]*)?>[\s\S]*?<\/si>/g;
    let sharedStringMatch: RegExpExecArray | null;

    while (
      (sharedStringMatch = sharedStringPattern.exec(
        sharedStringsXml,
      )) !== null
    ) {
      sharedStrings.push(readXmlTexts(sharedStringMatch[0]));
    }
  }

  const sheetXml = await sheetFile.async("string");
  const rows: string[][] = [];
  const rowPattern = /<row(?:\s[^>]*)?>[\s\S]*?<\/row>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(sheetXml)) !== null) {
    const row: string[] = [];
    const cellPattern = /<c(?:\s[^>]*)?>[\s\S]*?<\/c>/g;
    let cellMatch: RegExpExecArray | null;

    while (
      (cellMatch = cellPattern.exec(rowMatch[0])) !== null
    ) {
      const cellXml = cellMatch[0];
      const attributes = readCellAttributes(cellXml);
      const columnIndex = getCellColumnIndex(
        attributes.get("r") ?? "",
      );
      const type = attributes.get("t");
      const value =
        cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";

      if (type === "s") {
        row[columnIndex] =
          sharedStrings[Number(value)] ?? "";
      } else if (type === "inlineStr") {
        row[columnIndex] = readXmlTexts(cellXml);
      } else {
        row[columnIndex] = decodeXml(value);
      }
    }

    if (row.some((cell) => normalizeValue(cell))) {
      rows.push(row);
    }
  }

  return rows;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        currentCell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);

  if (
    currentRow.some((cell) => cell.trim()) ||
    rows.length === 0
  ) {
    rows.push(currentRow);
  }

  return rows.filter((row) =>
    row.some((cell) => cell.trim()),
  );
}

function tableRowsToObjects(rows: string[][]) {
  if (rows.length < 2) {
    return {
      rows: [],
      missingColumns: requiredColumns,
    };
  }

  const headerIndexes = new Map<string, number>();

  rows[0].forEach((header, index) => {
    headerIndexes.set(normalizeHeader(header), index);
  });

  const missingColumns = requiredColumns.filter(
    (column) =>
      !headerIndexes.has(normalizeHeader(column)),
  );

  if (missingColumns.length > 0) {
    return {
      rows: [],
      missingColumns,
    };
  }

  return {
    rows: rows.slice(1).map((row) => {
      return Object.fromEntries(
        requiredColumns.map((column) => {
          const index = headerIndexes.get(
            normalizeHeader(column),
          );

          return [
            column,
            normalizeValue(
              index === undefined ? "" : row[index],
            ),
          ];
        }),
      ) as ImportRow;
    }),
    missingColumns: [],
  };
}

async function readSpreadsheet(file: File) {
  if (file.size > MAX_TABLE_SIZE_BYTES) {
    throw new Error(
      "Размер таблицы не должен превышать 5 МБ.",
    );
  }

  const extension = getFileExtension(file.name);
  const arrayBuffer = await file.arrayBuffer();

  if (extension === "csv") {
    const text = new TextDecoder("utf-8").decode(
      arrayBuffer,
    );

    return tableRowsToObjects(parseCsv(text));
  }

  if (extension === "xlsx") {
    return tableRowsToObjects(
      await parseXlsxRows(arrayBuffer),
    );
  }

  throw new Error(
    "Загрузите таблицу в формате .xlsx или .csv.",
  );
}

function getFileExtension(fileName: string) {
  return path
    .extname(fileName)
    .slice(1)
    .toLowerCase();
}

function getBaseFileName(fileName: string) {
  return path
    .basename(fileName.replaceAll("\\", "/"))
    .toLowerCase();
}

async function readImages(zipFile: File | null) {
  if (!zipFile) {
    return new Map<string, JSZip.JSZipObject>();
  }

  if (getFileExtension(zipFile.name) !== "zip") {
    throw new Error(
      "Архив изображений должен быть в формате .zip.",
    );
  }

  const zip = await JSZip.loadAsync(
    await zipFile.arrayBuffer(),
  );

  const images = new Map<string, JSZip.JSZipObject>();

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) {
      continue;
    }

    const extension = getFileExtension(entry.name);

    if (!imageContentTypes.has(extension)) {
      continue;
    }

    images.set(getBaseFileName(entry.name), entry);
    images.set(entry.name.toLowerCase(), entry);
  }

  return images;
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

function parsePrice(value: string) {
  const normalizedValue = value
    .replace(/\s/g, "")
    .replace(",", ".");
  const price = Number(normalizedValue);

  return Number.isFinite(price) && price > 0
    ? price
    : null;
}

function parseHealing(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (
    ["да", "yes", "true", "1", "y"].includes(
      normalizedValue,
    )
  ) {
    return true;
  }

  if (
    ["нет", "no", "false", "0", "n"].includes(
      normalizedValue,
    )
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

function validateRow(row: ImportRow) {
  const errors: string[] = [];
  const requiredTextColumns: ImportColumn[] = [
    "Бренд",
    "Категория",
    "Название",
    "Цена",
    "Краткое описание",
    "Полное описание",
    "Способ применения",
    "Меры предосторожности",
    "Состав",
    "Лечебный товар (да/нет)",
    "Имя изображения",
  ];

  for (const column of requiredTextColumns) {
    if (!row[column]) {
      errors.push(`Не заполнено поле "${column}".`);
    }
  }

  const price = parsePrice(row["Цена"]);

  if (price === null) {
    errors.push("Цена должна быть положительным числом.");
  }

  const healing = parseHealing(row["Лечебный товар (да/нет)"]);

  if (healing === null) {
    errors.push(
      "Поле \"Лечебный товар (да/нет)\" должно быть \"да\" или \"нет\".",
    );
  }

  const imageExtension = getFileExtension(
    row["Имя изображения"],
  );

  if (
    row["Имя изображения"] &&
    !imageContentTypes.has(imageExtension)
  ) {
    errors.push(
      "Изображение должно быть JPG, PNG или WEBP.",
    );
  }

  return {
    errors,
    price,
    healing,
  };
}

async function findOrCreateBrand(name: string) {
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

async function findOrCreateCategory(name: string) {
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

async function uploadImage(
  imageName: string,
  images: Map<string, JSZip.JSZipObject>,
) {
  const image = images.get(imageName.toLowerCase()) ??
    images.get(getBaseFileName(imageName));

  if (!image) {
    throw new Error(
      `Файл изображения "${imageName}" не найден в архиве.`,
    );
  }

  const extension = getFileExtension(imageName);
  const contentType = imageContentTypes.get(extension);

  if (!contentType) {
    throw new Error(
      `Формат изображения "${imageName}" не поддерживается.`,
    );
  }

  const buffer = await image.async("nodebuffer");

  if (buffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(
      `Файл изображения "${imageName}" больше 5 МБ.`,
    );
  }

  const blob = await put(
    `products/${randomUUID()}.${extension}`,
    buffer,
    {
      access: "public",
      addRandomSuffix: false,
      contentType,
    },
  );

  return blob.url;
}

async function importRows(
  rows: ImportRow[],
  images: Map<string, JSZip.JSZipObject>,
) {
  const report: ImportReport = {
    imported: 0,
    updated: 0,
    errors: [],
  };

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const validation = validateRow(row);

    if (validation.errors.length > 0) {
      report.errors.push({
        row: rowNumber,
        name: row["Название"] || undefined,
        errors: validation.errors,
      });
      continue;
    }

    try {
      const [brand, category, imageUrl] = await Promise.all([
        findOrCreateBrand(row["Бренд"]),
        findOrCreateCategory(row["Категория"]),
        uploadImage(row["Имя изображения"], images),
      ]);

      const slug = createSlug(
        `${brand.name}-${row["Название"]}`,
      );
      const description = createDescription(row);
      const existingProduct = await prisma.product.findUnique({
        where: {
          slug,
        },
        select: {
          id: true,
        },
      });

      const data = {
        name: row["Название"],
        slug,
        brandId: brand.id,
        category: category.name,
        categoryId: category.id,
        price: validation.price!,
        description,
        healing: validation.healing!,
        activeIngredients: parseIngredients(
          row["Активные ингредиенты"],
        ),
        imageUrl,
      };

      if (existingProduct) {
        await prisma.product.update({
          where: {
            id: existingProduct.id,
          },
          data,
        });
        report.updated += 1;
      } else {
        await prisma.product.create({
          data,
        });
        report.imported += 1;
      }
    } catch (error) {
      report.errors.push({
        row: rowNumber,
        name: row["Название"] || undefined,
        errors: [
          error instanceof Error
            ? error.message
            : "Не удалось импортировать строку.",
        ],
      });
    }
  }

  return report;
}

export async function POST(request: Request) {
  const unauthorizedResponse = await requireAdminSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const formData = await request.formData();
    const spreadsheet = formData.get("spreadsheet");
    const imagesZip = formData.get("imagesZip");

    if (!(spreadsheet instanceof File)) {
      return NextResponse.json(
        { error: "Загрузите Excel или CSV-файл." },
        { status: 400 },
      );
    }

    const parsedTable = await readSpreadsheet(spreadsheet);

    if (parsedTable.missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: `В таблице не найдены колонки: ${parsedTable.missingColumns.join(", ")}.`,
        },
        { status: 400 },
      );
    }

    if (parsedTable.rows.length === 0) {
      return NextResponse.json(
        { error: "В таблице нет строк для импорта." },
        { status: 400 },
      );
    }

    if (parsedTable.rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        {
          error: `За один импорт можно загрузить не больше ${MAX_IMPORT_ROWS} товаров.`,
        },
        { status: 400 },
      );
    }

    const images = await readImages(
      imagesZip instanceof File ? imagesZip : null,
    );
    const report = await importRows(
      parsedTable.rows,
      images,
    );

    revalidatePath("/admin/products");
    revalidatePath("/admin/brands");
    revalidatePath("/admin/categories");
    revalidatePath("/catalog");
    revalidatePath("/brands");

    return NextResponse.json({
      success: true,
      ...report,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось выполнить импорт.",
      },
      { status: 400 },
    );
  }
}
