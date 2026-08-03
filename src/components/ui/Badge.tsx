"use client";

type Variant = "neutral" | "primary" | "success" | "danger" | "warning";

const VARIANT_CLASS: Record<Variant, string> = {
  neutral: "hl-badge-neutral",
  primary: "hl-badge-primary",
  success: "hl-badge-success",
  danger: "hl-badge-danger",
  warning: "hl-badge-warning",
};

export default function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: Variant;
}) {
  return <span className={`hl-badge ${VARIANT_CLASS[variant]}`}>{children}</span>;
}
