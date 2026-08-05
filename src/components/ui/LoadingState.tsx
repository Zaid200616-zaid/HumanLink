type Props = {
  label?: string;
  compact?: boolean;
};

/** Indicador de carga unificado en todo el dashboard. */
export default function LoadingState({ label = "Cargando…", compact }: Props) {
  return (
    <div className={compact ? "hl-loading hl-loading-compact" : "hl-loading"} role="status" aria-live="polite">
      <span className="hl-loading-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
