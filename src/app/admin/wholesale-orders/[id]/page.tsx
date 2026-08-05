import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  wholesaleBusinessTypeLabels,
  wholesaleContactMethodLabels,
  wholesaleStatusLabels,
} from "@/lib/wholesale";
import WholesaleRequestManager from "./WholesaleRequestManager";
import styles from "./wholesale-request.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Оптовая заявка" };

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" });

function valueOrFallback(value: string | null) {
  return value?.trim() || "Не указано";
}

function getSafeWebsite(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function WholesaleRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length > 191 || !/^[a-z0-9]+$/i.test(id)) notFound();

  const request = await prisma.wholesaleRequest.findUnique({
    where: { id },
    select: {
      id: true,
      contactName: true,
      phone: true,
      email: true,
      companyName: true,
      taxId: true,
      websiteUrl: true,
      country: true,
      city: true,
      businessType: true,
      preferredContact: true,
      expectedVolume: true,
      interestedBrands: true,
      interestedCategories: true,
      customerComment: true,
      adminComment: true,
      status: true,
      consentAcceptedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!request) notFound();
  const website = getSafeWebsite(request.websiteUrl);

  return (
    <main className={styles.page}>
      <Link href="/admin/wholesale-orders" className={styles.backLink}>← Назад к оптовым заявкам</Link>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>Оптовая заявка</p><h1>Заявка</h1><p className={styles.requestId}>{request.id}</p></div>
        <div className={styles.headerMeta}><span className={styles.statusBadge}>{wholesaleStatusLabels[request.status]}</span><time dateTime={request.createdAt.toISOString()}>{dateFormatter.format(request.createdAt)}</time></div>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}><h2>Контактное лицо</h2><dl className={styles.details}><div><dt>Имя</dt><dd>{request.contactName}</dd></div><div><dt>Телефон</dt><dd><a href={`tel:${request.phone}`}>{request.phone}</a></dd></div><div><dt>Email</dt><dd><a href={`mailto:${request.email}`}>{request.email}</a></dd></div><div><dt>Предпочтительная связь</dt><dd>{request.preferredContact ? wholesaleContactMethodLabels[request.preferredContact] ?? "Другое" : "Не указано"}</dd></div></dl></section>
        <section className={styles.card}><h2>Компания</h2><dl className={styles.details}><div><dt>Название</dt><dd>{valueOrFallback(request.companyName)}</dd></div><div><dt>ИНН / номер</dt><dd>{valueOrFallback(request.taxId)}</dd></div><div><dt>Сайт</dt><dd>{website ? <a href={website} target="_blank" rel="noopener noreferrer">Открыть сайт</a> : "Не указан"}</dd></div><div><dt>Тип бизнеса</dt><dd>{request.businessType ? wholesaleBusinessTypeLabels[request.businessType] ?? "Другое" : "Не указан"}</dd></div></dl></section>
        <section className={styles.card}><h2>Регион</h2><dl className={styles.details}><div><dt>Страна</dt><dd>{request.country}</dd></div><div><dt>Город</dt><dd>{request.city}</dd></div></dl></section>
        <section className={styles.card}><h2>Информация о заявке</h2><dl className={styles.details}><div><dt>Создана</dt><dd>{dateFormatter.format(request.createdAt)}</dd></div><div><dt>Обновлена</dt><dd>{dateFormatter.format(request.updatedAt)}</dd></div><div><dt>Согласие</dt><dd>{dateFormatter.format(request.consentAcceptedAt)}</dd></div></dl></section>
      </div>

      <section className={styles.cardWide}><h2>Интерес клиента</h2><dl className={styles.textDetails}><div><dt>Планируемый объём закупки</dt><dd>{request.expectedVolume}</dd></div><div><dt>Интересующие бренды</dt><dd>{valueOrFallback(request.interestedBrands)}</dd></div><div><dt>Интересующие категории</dt><dd>{valueOrFallback(request.interestedCategories)}</dd></div><div><dt>Комментарий клиента</dt><dd>{valueOrFallback(request.customerComment)}</dd></div></dl></section>

      <section className={styles.managerSection} aria-labelledby="manager-title"><h2 id="manager-title">Работа менеджера</h2><WholesaleRequestManager requestId={request.id} initialStatus={request.status} initialAdminComment={request.adminComment ?? ""} /></section>
    </main>
  );
}
