"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { descargarPdf } from "@/lib/pdf";

type DeptoRow = { departamento: string; organizacion: string; empleados: number };

export default function ReportesPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [generandoPdf, setGenerandoPdf] = useState(false);

  useEffect(() => {
    fetch(`/api/reportes?mes=${mes}`).then((r) => r.json()).then(setData);
  }, [mes]);

  async function registrarHistorial(tipo: string) {
    await fetch("/api/reportes/historial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes, tipo }),
    });
  }

  async function generarReportePdf() {
    setGenerandoPdf(true);
    try {
      await registrarHistorial("PDF_ADMINISTRATIVO");
      const datos = await fetch(`/api/reportes/export?format=json&mes=${mes}`).then((r) => r.json());
      const r = (data?.resumen as Record<string, number>) || {};
      await descargarPdf({
        titulo: `Reporte Administrativo — ${mes}`,
        archivo: `humanlink-reporte-${Date.now()}.pdf`,
        secciones: [
          {
            titulo: "Resumen general",
            head: ["Indicador", "Valor"],
            body: Object.entries(r).map(([k, v]) => [k.replace(/([A-Z])/g, " $1"), String(v)]),
          },
          {
            titulo: "Empleados",
            head: ["#", "Nombre", "Puesto", "Departamento", "Activo"],
            body: (datos.empleados || []).map((e: Record<string, string>) => [e.numero, e.nombre, e.puesto, e.departamento, e.activo]),
          },
          {
            titulo: "Solicitudes",
            head: ["ID", "Empleado", "Tipo", "Inicio", "Fin", "Días", "Estado"],
            body: (datos.solicitudes || []).map((s: Record<string, string | number>) => [s.id, s.empleado, s.tipo, s.inicio, s.fin, s.dias, s.estado]),
          },
        ],
      });
    } finally {
      setGenerandoPdf(false);
    }
  }

  if (!data) return <p>Cargando reportes...</p>;

  const resumen = data.resumen as Record<string, number>;
  const empleadosPorDepto = (data.empleadosPorDepto as DeptoRow[]) || [];
  const maxEmpleados = Math.max(...empleadosPorDepto.map((d) => d.empleados), 1);

  return (
    <div>
      <div className="mb-8 flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="page-title">Reportes Administrativos</h1>
          <p className="text-[#7F8C8D]">RF-H08 · RNF-B03 Exportación PDF / Excel con filtros del mes</p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="label-field text-xs">Mes del reporte</label>
            <input type="month" className="input-field" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
          <Link href="/reportes/historial" className="btn-outline text-sm">Historial</Link>
          <a href={`/api/reportes/export?format=csv&mes=${mes}`} onClick={() => registrarHistorial("CSV")} className="btn-outline flex items-center gap-2 text-sm">
            <Download size={16} /> CSV
          </a>
          <a href={`/api/reportes/export?format=xlsx&mes=${mes}`} onClick={() => registrarHistorial("XLSX")} className="btn-outline flex items-center gap-2 text-sm">
            <Download size={16} /> Excel
          </a>
          <button onClick={generarReportePdf} disabled={generandoPdf} className="btn-primary flex items-center gap-2 text-sm">
            <FileText size={16} /> {generandoPdf ? "Generando..." : "PDF"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Object.entries(resumen).map(([key, value]) => (
          <div key={key} className="card text-center">
            <p className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{value}</p>
            <p className="text-xs text-[#7F8C8D] capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
          </div>
        ))}
      </div>

      <div className="card mb-8">
        <h2 className="font-semibold mb-4">Empleados por Departamento</h2>
        <div className="space-y-2">
          {empleadosPorDepto.map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-40 text-sm truncate" title={`${d.organizacion} · ${d.departamento}`}>{d.departamento}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  className="h-5 rounded-full flex items-center justify-end pr-2 text-white text-xs"
                  style={{ width: `${Math.max((d.empleados / maxEmpleados) * 100, 8)}%`, background: "var(--color-primary)" }}
                >
                  {d.empleados}
                </div>
              </div>
            </div>
          ))}
          {empleadosPorDepto.length === 0 && <p className="text-[#7F8C8D] text-sm">Sin datos</p>}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Detalle por Departamento</h2>
        <div className="hl-table-wrap">
        <table className="hl-table">
          <thead>
            <tr>
              <th>Organización</th>
              <th>Departamento</th>
              <th className="text-right">Empleados</th>
            </tr>
          </thead>
          <tbody>
            {empleadosPorDepto.map((d, i) => (
              <tr key={i}>
                <td>{d.organizacion}</td>
                <td>{d.departamento}</td>
                <td className="text-right font-medium">{d.empleados}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
