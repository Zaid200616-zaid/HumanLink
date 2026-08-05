import StatusBadge from "@/components/ui/StatusBadge";

/** Badge unificado para estados Activo / Inactivo. */
export default function ActivoBadge({ activo }: { activo: boolean }) {
  return <StatusBadge estado={activo ? "ACTIVO" : "INACTIVO"} />;
}
