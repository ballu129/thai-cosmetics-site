import "server-only";

import type { PutCommandOptions } from "@vercel/blob";

type BlobAuthOptions = Pick<PutCommandOptions, "token">;

export class BlobAuthConfigurationError extends Error {
  constructor() {
    super(
      "Не настроена авторизация Vercel Blob для локальной разработки: задайте BLOB_READ_WRITE_TOKEN.",
    );
  }
}

export function getBlobAuthOptions(): BlobAuthOptions {
  if (process.env.VERCEL === "1") {
    return {};
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();

  if (token) {
    return {
      token,
    };
  }

  throw new BlobAuthConfigurationError();
}
