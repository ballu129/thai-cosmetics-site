export const WHOLESALE_REQUEST_STATUSES = [
  "NEW",
  "IN_PROGRESS",
  "CONTACTED",
  "APPROVED",
  "REJECTED",
] as const;

export type WholesaleRequestStatusValue =
  (typeof WHOLESALE_REQUEST_STATUSES)[number];

export const wholesaleStatusLabels: Record<
  WholesaleRequestStatusValue,
  string
> = {
  NEW: "Новая",
  IN_PROGRESS: "В обработке",
  CONTACTED: "Связались",
  APPROVED: "Одобрена",
  REJECTED: "Отклонена",
};

export const WHOLESALE_BUSINESS_TYPES = [
  { value: "RETAIL_STORE", label: "Розничный магазин" },
  { value: "ONLINE_STORE", label: "Интернет-магазин" },
  { value: "BEAUTY_SALON", label: "Салон красоты" },
  { value: "PHARMACY", label: "Аптека" },
  { value: "MARKETPLACE_SELLER", label: "Продавец на маркетплейсе" },
  { value: "DISTRIBUTOR", label: "Дистрибьютор" },
  { value: "OTHER", label: "Другое" },
] as const;

export const WHOLESALE_CONTACT_METHODS = [
  { value: "PHONE", label: "Телефон" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "TELEGRAM", label: "Telegram" },
] as const;

export const wholesaleBusinessTypeLabels = Object.fromEntries(
  WHOLESALE_BUSINESS_TYPES.map((item) => [item.value, item.label]),
) as Record<string, string>;

export const wholesaleContactMethodLabels = Object.fromEntries(
  WHOLESALE_CONTACT_METHODS.map((item) => [item.value, item.label]),
) as Record<string, string>;

export const WHOLESALE_FIELD_LIMITS = {
  contactName: 120,
  phone: 40,
  email: 254,
  companyName: 200,
  taxId: 80,
  websiteUrl: 500,
  country: 100,
  city: 120,
  expectedVolume: 300,
  interestedBrands: 500,
  interestedCategories: 500,
  customerComment: 2000,
  adminComment: 2000,
} as const;
