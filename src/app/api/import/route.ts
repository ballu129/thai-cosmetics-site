import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  MAX_IMPORT_ROWS,
  readImportSpreadsheet,
} from "@/lib/import/spreadsheet";
import { readImportImages } from "@/lib/import/images";
import { runProductImport } from "@/lib/import/products";
import type {
  ExistingProductMode,
  ImportRowResult,
} from "@/lib/import/columns";

export const runtime = "nodejs";

function parseAction(value: FormDataEntryValue | null) {
  return value === "import" ? "import" : "preview";
}

function parseExistingProductMode(
  value: FormDataEntryValue | null,
): ExistingProductMode {
  return value === "update" ? "update" : "skip";
}

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "true" || value === "1" || value === "yes";
}

function createImportErrorReport({
  dryRun,
  error,
}: {
  dryRun: boolean;
  error: string;
}) {
  const row: ImportRowResult = {
    row: 1,
    slug: "",
    name: "",
    brand: "",
    category: "",
    price: "",
    action: "error",
    status: "error",
    errors: [error],
  };

  return {
    success: false,
    error,
    dryRun,
    totalRows: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [row],
    rows: [row],
  };
}

function getSafeImportErrorMessage(error: unknown) {
  const fallback = "Не удалось выполнить импорт. Проверьте файл и повторите попытку.";

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

export async function POST(request: Request) {
  const unauthorizedResponse = await requireAdminSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  let dryRun = true;

  try {
    const formData = await request.formData();
    const action = parseAction(formData.get("action"));
    dryRun = action !== "import";
    const existingProductMode = parseExistingProductMode(
      formData.get("existingProductMode"),
    );
    const createMissingBrands = parseBoolean(
      formData.get("createMissingBrands"),
    );
    const spreadsheet = formData.get("spreadsheet");
    const imagesZip = formData.get("imagesZip");

    if (!(spreadsheet instanceof File) || spreadsheet.size === 0) {
      return NextResponse.json(
        createImportErrorReport({
          dryRun,
          error: "Загрузите Excel или CSV-файл.",
        }),
        { status: 400 },
      );
    }

    const parsedTable = await readImportSpreadsheet(spreadsheet);

    if (parsedTable.missingColumns.length > 0) {
      return NextResponse.json(
        createImportErrorReport({
          dryRun,
          error: `В таблице не найдены колонки: ${parsedTable.missingColumns.join(", ")}.`,
        }),
        { status: 400 },
      );
    }

    if (parsedTable.rows.length === 0) {
      return NextResponse.json(
        createImportErrorReport({
          dryRun,
          error: "В таблице нет строк для импорта.",
        }),
        { status: 400 },
      );
    }

    if (parsedTable.rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        createImportErrorReport({
          dryRun,
          error: `За один импорт можно загрузить не больше ${MAX_IMPORT_ROWS} товаров.`,
        }),
        { status: 400 },
      );
    }

    const images = await readImportImages(
      imagesZip instanceof File ? imagesZip : null,
    );
    const report = await runProductImport({
      dryRun,
      existingProductMode,
      createMissingBrands,
      rows: parsedTable.rows,
      images,
      prisma,
    });

    if (!dryRun && (report.created > 0 || report.updated > 0)) {
      revalidatePath("/admin/products");
      revalidatePath("/admin/products/import");
      revalidatePath("/admin/import");
      revalidatePath("/admin/brands");
      revalidatePath("/admin/categories");
      revalidatePath("/catalog");
      revalidatePath("/brands");
    }

    return NextResponse.json({
      success: report.errors.length === 0,
      existingProductMode,
      createMissingBrands,
      ...report,
    });
  } catch (error) {
    console.error("Product import failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      createImportErrorReport({
        dryRun,
        error: getSafeImportErrorMessage(error),
      }),
      { status: 400 },
    );
  }
}
