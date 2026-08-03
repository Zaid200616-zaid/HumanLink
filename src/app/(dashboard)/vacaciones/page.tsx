"use client";



import { useEffect, useState } from "react";

import Link from "next/link";

import { useSession } from "@/lib/use-session";

import { fetchList } from "@/lib/fetch-client";
import Avatar from "@/components/Avatar";

import ExpedienteVacacionesPanel from "@/components/ExpedienteVacacionesPanel";

import { Calendar, Users } from "lucide-react";



export default function VacacionesPage() {

  const { user, canManage, isEmpleado, isSupervisor, loading } = useSession();

  const [equipo, setEquipo] = useState<Array<{ id: number; nombre: string; apellidoPaterno: string; puesto: string; fotoUrl?: string | null }>>([]);

  const [selectedId, setSelectedId] = useState<number | null>(null);



  useEffect(() => {

    if (isEmpleado && user?.empleadoId) {

      setSelectedId(user.empleadoId);

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
  }, [canManage, isEmpleado, isSupervisor, user]);



  if (loading) return <p>Cargando...</p>;



  return (

    <div>

      <div className="mb-8">

        <h1 className="page-title">

          Gestión de Vacaciones

        </h1>

        <p className="text-[#7F8C8D]">

          Expediente de vacaciones · Saldo · Historial · Política LFT México

        </p>

      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {(canManage || isSupervisor) && (

          <div className="card lg:col-span-1">

            <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--color-primary)" }}>

              <Users size={18} /> Personal

            </h2>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">

              {equipo.map((e) => (

                <button

                  key={e.id}

                  onClick={() => setSelectedId(e.id)}

                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${

                    selectedId === e.id ? "bg-[#EBF5FB] border border-[#2874A6]" : "hover:bg-[#F4F6F7]"

                  }`}

                >

                  <Avatar nombre={e.nombre} apellido={e.apellidoPaterno} fotoUrl={e.fotoUrl} size="sm" />

                  <div>

                    <p className="text-sm font-medium">{e.nombre} {e.apellidoPaterno}</p>

                    <p className="text-xs text-[#7F8C8D]">{e.puesto}</p>

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

            <p className="text-[#7F8C8D] text-center py-8">

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

            <div key={ant} className="p-2 bg-[#F4F6F7] rounded text-center">

              <p className="font-medium">{ant}</p>

              <p className="text-[#17A589]">{dias}</p>

            </div>

          ))}

        </div>

        {canManage && (

          <Link href="/solicitudes" className="inline-block mt-4 text-sm text-[#2874A6] hover:underline">

            Ir a solicitudes pendientes →

          </Link>

        )}

      </div>

    </div>

  );

}


