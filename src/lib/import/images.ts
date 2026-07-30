import { randomUUID } from "node:crypto";
import path from "node:path";
import { put } from "@vercel/blob";
import JSZip from "jszip";
import {
  BlobAuthConfigurationError,
  getBlobAuthOptions,
} from "@/lib/blob-auth";

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export const IMAGE_CONTENT_TYPES = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);

export type ImportImageArchive = Map<string, JSZip.JSZipObject>;

export function getFileExtension(fileName: string) {
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

export function getImportImage(
  imageName: string,
  images: ImportImageArchive,
) {
  return images.get(imageName.toLowerCase()) ??
    images.get(getBaseFileName(imageName));
}

export function isSupportedImageName(imageName: string) {
  return IMAGE_CONTENT_TYPES.has(getFileExtension(imageName));
}

export async function readImportImages(zipFile: File | null) {
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

    if (!IMAGE_CONTENT_TYPES.has(extension)) {
      continue;
    }

    images.set(getBaseFileName(entry.name), entry);
    images.set(entry.name.toLowerCase(), entry);
  }

  return images;
}

export async function validateImportImage(
  imageName: string,
  images: ImportImageArchive,
) {
  if (!isSupportedImageName(imageName)) {
    return "Изображение должно быть JPG, PNG или WEBP.";
  }

  const image = getImportImage(imageName, images);

  if (!image) {
    return `Файл изображения "${imageName}" не найден в архиве.`;
  }

  const content = await image.async("uint8array");

  if (content.byteLength > MAX_IMAGE_SIZE_BYTES) {
    return `Файл изображения "${imageName}" больше 5 МБ.`;
  }

  return null;
}

export async function uploadImportImage(
  imageName: string,
  images: ImportImageArchive,
) {
  const image = getImportImage(imageName, images);

  if (!image) {
    throw new Error(
      `Файл изображения "${imageName}" не найден в архиве.`,
    );
  }

  const extension = getFileExtension(imageName);
  const contentType = IMAGE_CONTENT_TYPES.get(extension);

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

  try {
    const blob = await put(
      `products/${randomUUID()}.${extension}`,
      buffer,
      {
        access: "public",
        addRandomSuffix: false,
        contentType,
        ...getBlobAuthOptions(),
      },
    );

    return blob.url;
  } catch (error) {
    if (error instanceof BlobAuthConfigurationError) {
      throw error;
    }

    throw new Error(
      "Не удалось загрузить изображение в Vercel Blob.",
    );
  }
}
