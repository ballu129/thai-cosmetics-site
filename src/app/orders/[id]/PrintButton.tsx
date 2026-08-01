"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        padding: "10px 16px",
        border: "1px solid #777",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 16,
      }}
    >
      Распечатать заказ
    </button>
  );
}
