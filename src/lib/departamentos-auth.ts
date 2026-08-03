/** RNF-08 — Solo Administrador y Supervisor pueden modificar departamentos. */
export const DEPT_ROLES_ESCRITURA = ["Administrador", "Supervisor"] as const;

export const MSG_DEPT_SIN_AUTORIZACION =
  "No posee autorización para esta acción. Solo usuarios con rol Administrador o Supervisor pueden crear, modificar o eliminar departamentos.";

export function puedeModificarDepartamentos(rol: string): boolean {
  return (DEPT_ROLES_ESCRITURA as readonly string[]).includes(rol);
}
