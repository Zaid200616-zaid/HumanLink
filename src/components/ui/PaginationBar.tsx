"use client";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export default function PaginationBar({ page, totalPages, total, pageSize, onPageChange }: Props) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="hl-pagination">
      <span className="hl-pagination-count">
        {total === 0 ? "0 registros" : `${from}–${to} de ${total} registros`}
      </span>
      <div className="hl-pagination-controls">
        <button type="button" className="btn-outline text-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </button>
        <span className="text-sm text-[var(--color-muted)]">
          Página {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn-outline text-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
