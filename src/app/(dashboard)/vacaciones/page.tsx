"use client";



import { useEffect, useState } from "react";

import Link from "next/link";

import { useSession } from "@/lib/use-session";

import { fetchJson, fetchList } from "@/lib/fetch-client";
import Avatar from "@/components/Avatar";

import ExpedienteVacacionesPanel from "@/components/ExpedienteVacacionesPanel";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";

import { Calendar, Users } from "lucide-react";



export default function VacacionesPage() {

  const { user, canManage, isEmpleado, isSupervisor, loading } = useSession();

  const [equipo, setEquipo] = useState<Array<{ id: number; nombre: string; apellidoPaterno: string; puesto: string; fotoUrl?: string | null }>>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filtroPersonal, setFiltroPersonal] = useState("");



  useEffect(() => {
    if (loading) return;

    if (isEmpleado) {
      if (user?.empleadoId) {
        setSelectedId(user.empleadoId);
        return;
      }
      fetchJson<{ empleado?: { id: number } }>("/api/auth/me").then(({ data }) => {
        if (data?.empleado?.id) setSelectedId(data.empleado.id);
      });
      return;
    }

    if (canManage) {
      fetchList<{ id: number; nombre: string; apellidoPaterno: string; puesto: string; fotoUrl?: string | null; activo: boolean }>("/api/empleados")
        .then((list) => setEquipo(list.filter((e) => e.activo)));
      return;
    }
    if (isSupervisor && user?.empleadoId) {
      fetch("/api/departamentos")
        .then((r) => r.json())
        .then(async (depts: Array<{ id: number; supervisor?: { id: number } | null }>) => {
          const misDeptos = (Array.isArray(depts) ? depts : []).filter(
            (d) => d.supervisor?.id === user.empleadoId
          );
          if (misDeptos.length === 0) {
            setEquipo([]);
            return;
          }
          const todos = await Promise.all(
            misDeptos.map((d) =>
              fetchList<{
                id: number;
                nombre: string;
                apellidoPaterno: string;
                puesto: string;
                fotoUrl?: string | null;
                activo: boolean;
              }>(`/api/empleados?departamentoId=${d.id}`)
            )
          );
          setEquipo(todos.flat().filter((e) => e.activo));
        });
    }
  }, [canManage, isEmpleado, isSupervisor, user, loading]);

  const equipoFiltrado = equipo.filter((e) => {
    if (!filtroPersonal.trim()) return true;
    const q = filtroPersonal.trim().toLowerCase();
    return `${e.nombre} ${e.apellidoPaterno} ${e.puesto}`.toLowerCase().includes(q);
  });



  if (loading) return <LoadingState />;



  return (

    <div>

      <PageHeader
        title="Gestión de Vacaciones"
        subtitle="Saldo disponible, historial de movimientos y política interna de vacaciones"
      />



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {(canManage || isSupervisor) && (

          <div className="card lg:col-span-1">

            <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--color-primary)" }}>

              <Users size={18} /> Personal

            </h2>

            <input
              className="input-field w-full mb-3"
              placeholder="Buscar por nombre o puesto…"
              value={filtroPersonal}
              onChange={(e) => setFiltroPersonal(e.target.value)}
            />

            <div className="space-y-2 max-h-[500px] overflow-y-auto">

              {equipoFiltrado.map((e) => (

                <button

                  key={e.id}

                  onClick={() => setSelectedId(e.id)}

                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${

                    selectedId === e.id ? "hl-row-selected" : "hover:bg-[var(--color-surface-2)]"

                  }`}

                >

                  <Avatar nombre={e.nombre} apellido={e.apellidoPaterno} fotoUrl={e.fotoUrl} size="sm" />

                  <div>

                    <p className="text-sm font-medium">{e.nombre} {e.apellidoPaterno}</p>

                    <p className="text-xs text-muted">{e.puesto}</p>

                  </div>

                </button>

              ))}

            </div>

          </div>

        )}



        <div className={`card ${canManage || isSupervisor ? "lg:col-span-2" : "lg:col-span-3"}`}>

          {selectedId ? (

            <>

              <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--color-primary)" }}>

                <Calendar size={18} /> Expediente de vacaciones

              </h2>

              <ExpedienteVacacionesPanel empleadoId={selectedId} />

            </>

          ) : (

            <p className="text-muted text-center py-8">

              {canManage || isSupervisor ? "Selecciona un empleado para ver su expediente" : "No se encontró expediente"}

            </p>

          )}

        </div>

      </div>



      <div className="card mt-6">

        <h2 className="font-semibold mb-3" style={{ color: "var(--color-primary)" }}>Política de vacaciones (LFT)</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">

          {[

            ["1 año", "12 días"],

            ["2 años", "14 días"],

            ["3 años", "16 días"],

            ["4 años", "18 días"],

            ["5 años", "20 días"],

            ["6-10 años", "22 días"],

            ["11-15 años", "24 días"],

            ["16+ años", "26-32 días"],

          ].map(([ant, dias]) => (

            <div key={ant} className="p-2 bg-[var(--color-surface-2)] rounded text-center">

              <p className="font-medium">{ant}</p>

              <p className="text-success">{dias}</p>

            </div>

          ))}

        </div>

        {canManage && (

          <Link href="/solicitudes" className="inline-block mt-4 text-sm link-action hover:underline">

            Ir a solicitudes pendientes →

          </Link>

        )}

      </div>

    </div>

  );

}


