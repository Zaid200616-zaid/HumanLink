"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format-date";
import PageHeader from "@/components/ui/PageHeader";

type Historial = {
  id: number;
  mes: string;
  tipo: string;
  createdAt: string;
  usuario: { email: string; empleado: { nombre: string; apellidoPaterno: string } | null };
};

export default function HistorialReportesPage() {
  const [items, setItems] = useState<Historial[]>([]);

  useEffect(() => {
    fetch("/api/reportes/historial").then((r) => r.json()).then(setItems);
  }, []);

  return (
    <div>
      <Link href="/reportes" className="text-sm link-action hover:underline">← Volver a reportes</Link>
      <div className="mt-4">
        <PageHeader
          title="Historial de reportes"
          subtitle="Reportes generados por mes"
        />
      </div>

      <div className="hl-table-shell">
        <div className="hl-table-wrap">
        <table className="hl-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Mes</th>
              <th>Tipo</th>
              <th>Generado por</th>
            </tr>
          </thead>
          <tbody>
            {items.map((h) => (
              <tr key={h.id}>
                <td>{formatDateTime(h.createdAt)}</td>
                <td>{h.mes}</td>
                <td>{h.tipo}</td>
                <td>
                  {h.usuario.empleado
                    ? `${h.usuario.empleado.nombre} ${h.usuario.empleado.apellidoPaterno}`
                    : h.usuario.email}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={4} className="hl-table-empty">Aún no se han generado reportes en este periodo</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
