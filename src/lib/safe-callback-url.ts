export const DEFAULT_LOGIN_CALLBACK_URL = "/account";

const INTERNAL_URL_BASE = "https://siam-care.local";
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const INVISIBLE_DIRECTIONAL_CHARACTERS =
  /[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/;

function containsUnsafeCharacters(value: string) {
  return (
    value.includes("\\") ||
    CONTROL_CHARACTERS.test(value) ||
    INVISIBLE_DIRECTIONAL_CHARACTERS.test(value)
  );
}

export function getSafeLoginCallbackUrl(
  value: string | null | undefined,
) {
  if (
    typeof value !== "string" ||
    !value ||
    value !== value.trim() ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    containsUnsafeCharacters(value)
  ) {
    return DEFAULT_LOGIN_CALLBACK_URL;
  }

  let decodedValue: string;

  try {
    decodedValue = decodeURIComponent(value);
  } catch {
    return DEFAULT_LOGIN_CALLBACK_URL;
  }

  if (
    decodedValue.startsWith("//") ||
    containsUnsafeCharacters(decodedValue)
  ) {
    return DEFAULT_LOGIN_CALLBACK_URL;
  }

  try {
    const parsedUrl = new URL(value, INTERNAL_URL_BASE);

    if (
      parsedUrl.origin !== INTERNAL_URL_BASE ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      return DEFAULT_LOGIN_CALLBACK_URL;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return DEFAULT_LOGIN_CALLBACK_URL;
  }
}
