import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  BlobAuthConfigurationError,
  getBlobAuthOptions,
} from "@/lib/blob-auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const allowedImageExtensions = ["jpg", "jpeg", "png", "webp"];

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function isAllowedImage(file: File) {
  const extension = getFileExtension(file.name);

  return (
    allowedImageTypes.has(file.type) &&
    allowedImageExtensions.includes(extension)
  );
}

async function handleServerUpload(request: Request) {
  const unauthorizedResponse = await requireAdminSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const formData = await request.formData();

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Файл не передан." },
      { status: 400 },
    );
  }

  if (!isAllowedImage(file)) {
    return NextResponse.json(
      {
        error:
          "Можно загружать только изображения JPG, PNG или WEBP.",
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Размер изображения не должен превышать 5 МБ." },
      { status: 400 },
    );
  }

  const extension = allowedImageTypes.get(file.type) ?? "jpg";
  const pathname = `products/${randomUUID()}.${extension}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
    ...getBlobAuthOptions(),
  });

  return NextResponse.json({
    success: true,
    imageUrl: blob.url,
  });
}

export async function POST(request: Request) {
  try {
    return handleServerUpload(request);
  } catch (error) {
    console.error("Product image upload failed.");
    const message =
      error instanceof BlobAuthConfigurationError
        ? error.message
        : "Не удалось загрузить файл.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 },
    );
  }
}
