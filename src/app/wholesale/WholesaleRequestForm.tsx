"use client";

import { FormEvent, useState } from "react";
import {
  WHOLESALE_BUSINESS_TYPES,
  WHOLESALE_CONTACT_METHODS,
  WHOLESALE_FIELD_LIMITS,
} from "@/lib/wholesale";
import styles from "./wholesale.module.css";

type ApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function FieldError({ field, errors }: { field: string; errors: Record<string, string> }) {
  const message = errors[field];
  return message ? (
    <span id={`${field}-error`} className={styles.fieldError} role="alert">
      {message}
    </span>
  ) : null;
}

export default function WholesaleRequestForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || submitted) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    body.consent = formData.get("consent") === "on";

    setSubmitting(true);
    setMessage("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/wholesale-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        setMessage(data.error ?? "Не удалось отправить заявку. Попробуйте позже.");
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      setSubmitted(true);
      setMessage(data.message ?? "Заявка отправлена.");
      form.reset();
    } catch {
      setMessage("Не удалось отправить заявку. Проверьте соединение и попробуйте позже.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className={styles.successMessage} role="status" aria-live="polite">
        <h3>Заявка принята</h3>
        <p>{message}</p>
      </div>
    );
  }

  const describedBy = (field: string) =>
    fieldErrors[field] ? `${field}-error` : undefined;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Контактное лицо *</span>
          <input name="contactName" maxLength={WHOLESALE_FIELD_LIMITS.contactName} required aria-invalid={Boolean(fieldErrors.contactName)} aria-describedby={describedBy("contactName")} />
          <FieldError field="contactName" errors={fieldErrors} />
        </label>
        <label className={styles.field}>
          <span>Название компании</span>
          <input name="companyName" maxLength={WHOLESALE_FIELD_LIMITS.companyName} aria-invalid={Boolean(fieldErrors.companyName)} aria-describedby={describedBy("companyName")} />
          <FieldError field="companyName" errors={fieldErrors} />
        </label>
        <label className={styles.field}>
          <span>Телефон *</span>
          <input name="phone" type="tel" autoComplete="tel" maxLength={WHOLESALE_FIELD_LIMITS.phone} required aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={describedBy("phone")} />
          <FieldError field="phone" errors={fieldErrors} />
        </label>
        <label className={styles.field}>
          <span>Email *</span>
          <input name="email" type="email" autoComplete="email" maxLength={WHOLESALE_FIELD_LIMITS.email} required aria-invalid={Boolean(fieldErrors.email)} aria-describedby={describedBy("email")} />
          <FieldError field="email" errors={fieldErrors} />
        </label>
        <label className={styles.field}>
          <span>Страна *</span>
          <input name="country" autoComplete="country-name" maxLength={WHOLESALE_FIELD_LIMITS.country} required aria-invalid={Boolean(fieldErrors.country)} aria-describedby={describedBy("country")} />
          <FieldError field="country" errors={fieldErrors} />
        </label>
        <label className={styles.field}>
          <span>Город *</span>
          <input name="city" autoComplete="address-level2" maxLength={WHOLESALE_FIELD_LIMITS.city} required aria-invalid={Boolean(fieldErrors.city)} aria-describedby={describedBy("city")} />
          <FieldError field="city" errors={fieldErrors} />
        </label>
        <label className={styles.field}>
          <span>ИНН или регистрационный номер компании</span>
          <input name="taxId" maxLength={WHOLESALE_FIELD_LIMITS.taxId} aria-invalid={Boolean(fieldErrors.taxId)} aria-describedby={describedBy("taxId")} />
          <FieldError field="taxId" errors={fieldErrors} />
        </label>
        <label className={styles.field}>
          <span>Сайт компании</span>
          <input name="websiteUrl" type="url" placeholder="https://example.ru" maxLength={WHOLESALE_FIELD_LIMITS.websiteUrl} aria-invalid={Boolean(fieldErrors.websiteUrl)} aria-describedby={describedBy("websiteUrl")} />
          <FieldError field="websiteUrl" errors={fieldErrors} />
        </label>
        <label className={styles.field}>
          <span>Тип бизнеса</span>
          <select name="businessType" defaultValue="" aria-invalid={Boolean(fieldErrors.businessType)} aria-describedby={describedBy("businessType")}>
            <option value="">Не выбран</option>
            {WHOLESALE_BUSINESS_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <FieldError field="businessType" errors={fieldErrors} />
        </label>
        <label className={styles.field}>
          <span>Предпочтительный способ связи</span>
          <select name="preferredContact" defaultValue="" aria-invalid={Boolean(fieldErrors.preferredContact)} aria-describedby={describedBy("preferredContact")}>
            <option value="">Не выбран</option>
            {WHOLESALE_CONTACT_METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <FieldError field="preferredContact" errors={fieldErrors} />
        </label>
        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Планируемый объём закупки *</span>
          <input name="expectedVolume" maxLength={WHOLESALE_FIELD_LIMITS.expectedVolume} placeholder="Опишите ориентировочный объём или ассортимент" required aria-invalid={Boolean(fieldErrors.expectedVolume)} aria-describedby={describedBy("expectedVolume")} />
          <FieldError field="expectedVolume" errors={fieldErrors} />
        </label>
        <label className={styles.field}>
          <span>Интересующие бренды</span>
          <textarea name="interestedBrands" rows={3} maxLength={WHOLESALE_FIELD_LIMITS.interestedBrands} aria-invalid={Boolean(fieldErrors.interestedBrands)} aria-describedby={describedBy("interestedBrands")} />
          <FieldError field="interestedBrands" errors={fieldErrors} />
        </label>
        <label className={styles.field}>
          <span>Интересующие категории</span>
          <textarea name="interestedCategories" rows={3} maxLength={WHOLESALE_FIELD_LIMITS.interestedCategories} aria-invalid={Boolean(fieldErrors.interestedCategories)} aria-describedby={describedBy("interestedCategories")} />
          <FieldError field="interestedCategories" errors={fieldErrors} />
        </label>
        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Комментарий</span>
          <textarea name="customerComment" rows={5} maxLength={WHOLESALE_FIELD_LIMITS.customerComment} aria-invalid={Boolean(fieldErrors.customerComment)} aria-describedby={describedBy("customerComment")} />
          <FieldError field="customerComment" errors={fieldErrors} />
        </label>
      </div>

      <label className={styles.consentField}>
        <input type="checkbox" name="consent" aria-invalid={Boolean(fieldErrors.consent)} aria-describedby={describedBy("consent")} />
        <span>Я согласен(на) на обработку персональных данных для рассмотрения оптовой заявки. *</span>
      </label>
      <FieldError field="consent" errors={fieldErrors} />

      <label className={styles.honeypot} aria-hidden="true">
        <span>Адрес компании</span>
        <input name="companyAddress" tabIndex={-1} autoComplete="off" />
      </label>

      {message ? <p className={styles.formError} role="alert" aria-live="assertive">{message}</p> : null}

      <button className={styles.submitButton} type="submit" disabled={submitting}>
        {submitting ? "Отправка…" : "Отправить оптовую заявку"}
      </button>
    </form>
  );
}
