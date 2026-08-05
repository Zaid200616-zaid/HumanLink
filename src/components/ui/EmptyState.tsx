type Props = {
  message?: string;
  children?: React.ReactNode;
};

/** Estado vacío unificado (tablas, listas). */
export default function EmptyState({ message = "No hay registros.", children }: Props) {
  return (
    <div className="hl-table-empty" role="status">
      {children ?? message}
    </div>
  );
}
