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

export const runtime = "nodejs";

function parseDryRun(value: FormDataEntryValue | null) {
  return value !== "false";
}

function createImportErrorReport({
  dryRun,
  error,
}: {
  dryRun: boolean;
  error: string;
}) {
  const row = {
    row: 1,
    slug: "",
    name: "",
    status: "error" as const,
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

export async function POST(request: Request) {
  const unauthorizedResponse = await requireAdminSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  let dryRun = true;

  try {
    const formData = await request.formData();
    dryRun = parseDryRun(formData.get("dryRun"));
    const spreadsheet = formData.get("spreadsheet");
    const imagesZip = formData.get("imagesZip");

    if (!(spreadsheet instanceof File)) {
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
      rows: parsedTable.rows,
      images,
      prisma,
    });

    if (!dryRun && (report.created > 0 || report.updated > 0)) {
      revalidatePath("/admin/products");
      revalidatePath("/admin/brands");
      revalidatePath("/admin/categories");
      revalidatePath("/catalog");
      revalidatePath("/brands");
    }

    return NextResponse.json({
      success: report.errors.length === 0,
      ...report,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      createImportErrorReport({
        dryRun,
        error:
          error instanceof Error
            ? error.message
            : "Не удалось выполнить импорт.",
      }),
      { status: 400 },
    );
  }
}
