"use client";

type Props = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
};

export default function Modal({ open, title, children, footer, onClose, size = "md" }: Props) {
  if (!open) return null;
  return (
    <div className="hl-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`hl-modal ${size === "lg" ? "hl-modal-lg" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hl-modal-title"
      >
        <h2 id="hl-modal-title" className="hl-modal-title">
          {title}
        </h2>
        <div className="hl-modal-body">{children}</div>
        {footer && <div className="hl-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
