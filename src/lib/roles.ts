export const CONTRASENA_TEMPORAL_EMPLEADO = "HumanLink2026!";
export const DEMO_PASSWORD = CONTRASENA_TEMPORAL_EMPLEADO;



export const DEMO_USERS = [

  {

    label: "Administrador",

    email: "admin@humanlink.mx",

    rol: "Administrador",

    descripcion: "Acceso total al sistema",

  },

  {

    label: "Recursos Humanos",

    email: "ernesto.gutierrez@humanlink.mx",

    rol: "Recursos Humanos",

    descripcion: "Gestión de personal y contrataciones",

  },

  {

    label: "Supervisor",

    email: "carlos.ramirez@humanlink.mx",

    rol: "Supervisor",

    descripcion: "Supervisión de equipo y evaluaciones",

  },

  {

    label: "Empleado",

    email: "ramses.dejesus@humanlink.mx",

    rol: "Empleado",

    descripcion: "Solicitar permisos, inscribirse en eventos y capacitaciones",

  },

  {

    label: "Empleada",

    email: "carol.olaiz@humanlink.mx",

    rol: "Empleado",

    descripcion: "Analista de base de datos",

  },

] as const;



export type NavItem = {

  href: string;

  label: string;

  group: string;

  roles: string[];

};



/** Menú alineado al alcance del proyecto (solo módulos RF permitidos). */

export const NAV_ITEMS: NavItem[] = [

  { href: "/dashboard", label: "Inicio", group: "General", roles: ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"] },
  { href: "/perfil", label: "Mi Perfil", group: "General", roles: ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"] },
  { href: "/buscar", label: "Búsqueda", group: "General", roles: ["Administrador", "Recursos Humanos", "Supervisor"] },
  { href: "/notificaciones", label: "Notificaciones", group: "General", roles: ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"] },



  { href: "/empleados", label: "Empleados", group: "Personal", roles: ["Administrador", "Recursos Humanos", "Supervisor"] },
  { href: "/documentos", label: "Documentos", group: "Personal", roles: ["Administrador", "Recursos Humanos"] },
  { href: "/departamentos", label: "Departamentos", group: "Organización", roles: ["Administrador", "Recursos Humanos", "Supervisor"] },

  { href: "/registro-entrada", label: "Registrar Entrada", group: "Personal", roles: ["Empleado"] },
  { href: "/asistencias", label: "Asistencias", group: "Personal", roles: ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"] },

  { href: "/turnos", label: "Turnos Laborales", group: "Personal", roles: ["Administrador", "Recursos Humanos"] },

  { href: "/solicitudes", label: "Permisos y Vacaciones", group: "Personal", roles: ["Administrador", "Recursos Humanos", "Empleado", "Supervisor"] },

  { href: "/vacaciones", label: "Expediente Vacaciones", group: "Personal", roles: ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"] },



  { href: "/vacantes", label: "Vacantes", group: "Reclutamiento", roles: ["Administrador", "Recursos Humanos"] },

  { href: "/candidatos", label: "Contrataciones", group: "Reclutamiento", roles: ["Administrador", "Recursos Humanos"] },



  { href: "/capacitaciones", label: "Capacitaciones", group: "Desarrollo", roles: ["Administrador", "Recursos Humanos", "Empleado"] },

  { href: "/evaluaciones", label: "Evaluaciones", group: "Desarrollo", roles: ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"] },
  { href: "/eventos", label: "Eventos Organizacionales", group: "Desarrollo", roles: ["Administrador", "Recursos Humanos", "Supervisor", "Empleado"] },



  { href: "/quejas", label: "Quejas Laborales", group: "Comunicación", roles: ["Administrador", "Recursos Humanos", "Empleado"] },



  { href: "/reportes", label: "Reportes", group: "Administración", roles: ["Administrador", "Recursos Humanos", "Supervisor"] },

  { href: "/reportes/historial", label: "Historial de reportes", group: "Administración", roles: ["Administrador", "Recursos Humanos"] },

  { href: "/permisos-rol", label: "Asignación de roles", group: "Administración", roles: ["Administrador"] },

];



export function getNavForRole(rol: string): Record<string, NavItem[]> {

  const items = NAV_ITEMS.filter((item) => item.roles.includes(rol));

  return items.reduce<Record<string, NavItem[]>>((acc, item) => {

    if (!acc[item.group]) acc[item.group] = [];

    acc[item.group].push(item);

    return acc;

  }, {});

}

