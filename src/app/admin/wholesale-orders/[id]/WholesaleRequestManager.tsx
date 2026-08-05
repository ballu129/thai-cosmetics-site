"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  WHOLESALE_FIELD_LIMITS,
  WHOLESALE_REQUEST_STATUSES,
  type WholesaleRequestStatusValue,
  wholesaleStatusLabels,
} from "@/lib/wholesale";
import styles from "./wholesale-request.module.css";

export default function WholesaleRequestManager({ requestId, initialStatus, initialAdminComment }: { requestId: string; initialStatus: WholesaleRequestStatusValue; initialAdminComment: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [adminComment, setAdminComment] = useState(initialAdminComment);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setMessage(""); setIsError(false);
    try {
      const response = await fetch(`/api/admin/wholesale-requests/${encodeURIComponent(requestId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, adminComment }) });
      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) { setIsError(true); setMessage(data.error ?? "Не удалось сохранить изменения."); return; }
      setMessage("Изменения сохранены."); router.refresh();
    } catch { setIsError(true); setMessage("Не удалось сохранить изменения."); }
    finally { setSaving(false); }
  }

  return <form className={styles.managerForm} onSubmit={handleSubmit}>
    <label><span>Статус</span><select value={status} onChange={(event) => setStatus(event.target.value as WholesaleRequestStatusValue)}>{WHOLESALE_REQUEST_STATUSES.map((item) => <option key={item} value={item}>{wholesaleStatusLabels[item]}</option>)}</select></label>
    <label><span>Внутренний комментарий</span><textarea rows={6} maxLength={WHOLESALE_FIELD_LIMITS.adminComment} value={adminComment} onChange={(event) => setAdminComment(event.target.value)} /><small>Доступен только администраторам.</small></label>
    {message ? <p className={isError ? styles.errorMessage : styles.successMessage} role={isError ? "alert" : "status"} aria-live="polite">{message}</p> : null}
    <button type="submit" disabled={saving}>{saving ? "Сохранение…" : "Сохранить изменения"}</button>
  </form>;
}
