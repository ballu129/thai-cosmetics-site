import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const allowedImageExtensions = ["jpg", "jpeg", "png", "webp"];
const safeProductImagePathPattern =
  /^products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/;

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

function isSafeProductImagePath(pathname: string) {
  return safeProductImagePathPattern.test(pathname);
}

async function handleClientUpload(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  if (body.type === "blob.generate-client-token") {
    const unauthorizedResponse = await requireAdminSession();

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }
  }

  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => {
      if (!isSafeProductImagePath(pathname)) {
        throw new Error("Некорректное имя файла изображения.");
      }

      return {
        allowedContentTypes: Array.from(allowedImageTypes.keys()),
        maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
        addRandomSuffix: false,
        tokenPayload: JSON.stringify({ pathname }),
      };
    },
    onUploadCompleted: async ({ blob }) => {
      console.log("Product image uploaded", blob.url);
    },
  });

  return NextResponse.json(jsonResponse);
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
  });

  return NextResponse.json({
    success: true,
    imageUrl: blob.url,
  });
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return handleClientUpload(request);
    }

    return handleServerUpload(request);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить файл.",
      },
      { status: 400 },
    );
  }
}
