import Badge from "@/components/ui/Badge";
import { resolveEstadoBadge } from "@/lib/estado-badge";

type Props = {
  estado: string;
  label?: string;
};

/** Badge unificado para cualquier estado del sistema. */
export default function StatusBadge({ estado, label }: Props) {
  const resolved = resolveEstadoBadge(estado);
  return <Badge variant={resolved.variant}>{label ?? resolved.label}</Badge>;
}
