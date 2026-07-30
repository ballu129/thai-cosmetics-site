import "server-only";

import type { PutCommandOptions } from "@vercel/blob";

type BlobAuthOptions = Pick<
  PutCommandOptions,
  "oidcToken" | "storeId" | "token"
>;

export class BlobAuthConfigurationError extends Error {
  constructor() {
    super(
      "Не настроена авторизация Vercel Blob: на Vercel требуется OIDC-пара VERCEL_OIDC_TOKEN и BLOB_STORE_ID, локально требуется BLOB_READ_WRITE_TOKEN.",
    );
  }
}

export function getBlobAuthOptions(): BlobAuthOptions {
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  const storeId = process.env.BLOB_STORE_ID?.trim();

  if (oidcToken && storeId) {
    return {
      oidcToken,
      storeId,
    };
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();

  if (token) {
    return {
      token,
    };
  }

  throw new BlobAuthConfigurationError();
}
