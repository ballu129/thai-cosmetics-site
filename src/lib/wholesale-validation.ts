import {
  WHOLESALE_BUSINESS_TYPES,
  WHOLESALE_CONTACT_METHODS,
  WHOLESALE_FIELD_LIMITS,
} from "@/lib/wholesale";

type WholesaleRequestInput = {
  contactName: string;
  phone: string;
  email: string;
  companyName: string | null;
  taxId: string | null;
  websiteUrl: string | null;
  country: string;
  city: string;
  businessType: string | null;
  preferredContact: string | null;
  expectedVolume: string;
  interestedBrands: string | null;
  interestedCategories: string | null;
  customerComment: string | null;
};

type ValidationResult =
  | { success: true; data: WholesaleRequestInput; honeypotTriggered: boolean }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string>;
    };

const ALLOWED_FIELDS = new Set([
  "contactName",
  "phone",
  "email",
  "companyName",
  "taxId",
  "websiteUrl",
  "country",
  "city",
  "businessType",
  "preferredContact",
  "expectedVolume",
  "interestedBrands",
  "interestedCategories",
  "customerComment",
  "consent",
  "companyAddress",
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+()\d\s.\-]{6,40}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  return value.normalize("NFKC").trim().replace(/[ \t]+/g, " ");
}

function readRequired(
  body: Record<string, unknown>,
  field: keyof typeof WHOLESALE_FIELD_LIMITS,
  label: string,
  errors: Record<string, string>,
) {
  const value = normalizeText(body[field]);

  if (!value) {
    errors[field] = `Заполните поле «${label}».`;
    return "";
  }

  if (value.length > WHOLESALE_FIELD_LIMITS[field]) {
    errors[field] = `Поле «${label}» слишком длинное.`;
  }

  return value;
}

function readOptional(
  body: Record<string, unknown>,
  field: keyof typeof WHOLESALE_FIELD_LIMITS,
  label: string,
  errors: Record<string, string>,
) {
  if (
    body[field] !== null &&
    body[field] !== undefined &&
    typeof body[field] !== "string"
  ) {
    errors[field] = `Поле «${label}» заполнено некорректно.`;
    return null;
  }

  const value = normalizeText(body[field]);

  if (!value) return null;

  if (value.length > WHOLESALE_FIELD_LIMITS[field]) {
    errors[field] = `Поле «${label}» слишком длинное.`;
  }

  return value;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateWholesaleRequestInput(body: unknown): ValidationResult {
  if (!isRecord(body)) {
    return { success: false, error: "Переданы некорректные данные заявки." };
  }

  if (
    body.companyAddress !== undefined &&
    typeof body.companyAddress !== "string"
  ) {
    return { success: false, error: "Переданы некорректные данные заявки." };
  }

  if (Object.keys(body).some((key) => !ALLOWED_FIELDS.has(key))) {
    return { success: false, error: "Переданы некорректные данные заявки." };
  }

  const honeypot = normalizeText(body.companyAddress);
  if (honeypot) {
    return {
      success: true,
      honeypotTriggered: true,
      data: {
        contactName: "",
        phone: "",
        email: "",
        companyName: null,
        taxId: null,
        websiteUrl: null,
        country: "",
        city: "",
        businessType: null,
        preferredContact: null,
        expectedVolume: "",
        interestedBrands: null,
        interestedCategories: null,
        customerComment: null,
      },
    };
  }

  const fieldErrors: Record<string, string> = {};
  const contactName = readRequired(body, "contactName", "Контактное лицо", fieldErrors);
  const phone = readRequired(body, "phone", "Телефон", fieldErrors);
  const email = readRequired(body, "email", "Email", fieldErrors).toLowerCase();
  const country = readRequired(body, "country", "Страна", fieldErrors);
  const city = readRequired(body, "city", "Город", fieldErrors);
  const expectedVolume = readRequired(
    body,
    "expectedVolume",
    "Планируемый объём закупки",
    fieldErrors,
  );
  const companyName = readOptional(body, "companyName", "Название компании", fieldErrors);
  const taxId = readOptional(body, "taxId", "ИНН или регистрационный номер", fieldErrors);
  const websiteUrl = readOptional(body, "websiteUrl", "Сайт компании", fieldErrors);
  const interestedBrands = readOptional(
    body,
    "interestedBrands",
    "Интересующие бренды",
    fieldErrors,
  );
  const interestedCategories = readOptional(
    body,
    "interestedCategories",
    "Интересующие категории",
    fieldErrors,
  );
  const customerComment = readOptional(body, "customerComment", "Комментарий", fieldErrors);

  if (email && !EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Укажите корректный email.";
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    fieldErrors.phone = "Укажите корректный телефон.";
  }

  if (websiteUrl && !isHttpUrl(websiteUrl)) {
    fieldErrors.websiteUrl = "Укажите полный адрес сайта с http:// или https://.";
  }

  const businessType = normalizeText(body.businessType);
  const allowedBusinessTypes = new Set(WHOLESALE_BUSINESS_TYPES.map((item) => item.value));
  if (
    body.businessType !== null &&
    body.businessType !== undefined &&
    typeof body.businessType !== "string"
  ) {
    fieldErrors.businessType = "Выберите тип бизнеса из списка.";
  } else if (businessType && !allowedBusinessTypes.has(businessType as never)) {
    fieldErrors.businessType = "Выберите тип бизнеса из списка.";
  }

  const preferredContact = normalizeText(body.preferredContact);
  const allowedContactMethods = new Set(
    WHOLESALE_CONTACT_METHODS.map((item) => item.value),
  );
  if (
    body.preferredContact !== null &&
    body.preferredContact !== undefined &&
    typeof body.preferredContact !== "string"
  ) {
    fieldErrors.preferredContact = "Выберите способ связи из списка.";
  } else if (
    preferredContact &&
    !allowedContactMethods.has(preferredContact as never)
  ) {
    fieldErrors.preferredContact = "Выберите способ связи из списка.";
  }

  if (body.consent !== true) {
    fieldErrors.consent = "Необходимо согласие на обработку персональных данных.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Проверьте заполнение формы.",
      fieldErrors,
    };
  }

  return {
    success: true,
    honeypotTriggered: false,
    data: {
      contactName,
      phone,
      email,
      companyName,
      taxId,
      websiteUrl,
      country,
      city,
      businessType: businessType || null,
      preferredContact: preferredContact || null,
      expectedVolume,
      interestedBrands,
      interestedCategories,
      customerComment,
    },
  };
}
