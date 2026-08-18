from core.models import WorkflowAprobacion


def requiere_supervisor_sync(modulo: str, tiene_supervisor_depto: bool) -> bool:
    wf = WorkflowAprobacion.objects.filter(modulo=modulo, activo=True).first()
    if wf and "Supervisor" not in (wf.niveles or ""):
        return False
    return tiene_supervisor_depto
