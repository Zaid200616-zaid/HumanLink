"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      <Link href="/reportes" className="text-sm text-[#2874A6] hover:underline">← Volver a reportes</Link>
      <div className="mb-8 mt-4">
        <h1 className="page-title">Historial de reportes</h1>
        <p className="text-[#7F8C8D]">RF-H08 · Reportes generados por mes</p>
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
                <td>{new Date(h.createdAt).toLocaleString("es-MX")}</td>
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
              <tr><td colSpan={4} className="hl-table-empty">Sin reportes generados aún</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
