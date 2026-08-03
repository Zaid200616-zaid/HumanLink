"use client";

import { ChevronDown, ChevronUp, Search } from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";

export type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => React.ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (q: string) => void;
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  onPageChange?: (p: number) => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  rowClassName?: (row: T) => string | undefined;
  emptyMessage?: string;
  toolbar?: React.ReactNode;
};

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  searchPlaceholder = "Buscar…",
  searchValue = "",
  onSearchChange,
  total,
  page = 1,
  pageSize = 25,
  totalPages = 1,
  onPageChange,
  sortKey,
  sortDir = "asc",
  onSort,
  rowClassName,
  emptyMessage = "No hay registros.",
  toolbar,
}: Props<T>) {
  return (
    <div className="hl-table-shell">
      {(onSearchChange || toolbar) && (
        <div className="hl-table-toolbar">
          {onSearchChange && (
            <div className="hl-table-search">
              <Search size={16} className="hl-table-search-icon" aria-hidden />
              <input
                type="search"
                className="input-field"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      <div className="hl-table-wrap">
        <table className="hl-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>
                  {col.sortable && onSort ? (
                    <button type="button" className="hl-table-sort" onClick={() => onSort(col.key)}>
                      {col.label}
                      {sortKey === col.key &&
                        (sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="hl-table-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className={rowClassName?.(row)}>
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>
                      {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {onPageChange && total !== undefined && (
        <PaginationBar page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={onPageChange} />
      )}
    </div>
  );
}
