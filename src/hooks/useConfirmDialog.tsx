"use client";

import { useCallback, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type DialogConfig = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

/** Diálogo de confirmación unificado (reemplaza confirm() nativo). */
export function useConfirmDialog() {
  const [config, setConfig] = useState<DialogConfig | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback(
    (title: string, message: string, confirmLabel = "Confirmar", cancelLabel = "Cancelar") =>
      new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setConfig({ title, message, confirmLabel, cancelLabel });
      }),
    []
  );

  const close = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setConfig(null);
  }, []);

  const ConfirmDialogHost = config ? (
    <ConfirmDialog
      open
      title={config.title}
      message={config.message}
      confirmLabel={config.confirmLabel}
      cancelLabel={config.cancelLabel}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null;

  return { confirm, ConfirmDialogHost };
}
