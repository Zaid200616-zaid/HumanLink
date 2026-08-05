"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

type ToastItem = { id: number; type: ToastType; message: string };

type ToastContextValue = {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
};

const TOAST_DURATION_MS = 4500;

const TOAST_CLASS: Record<ToastType, string> = {
  success: "hl-toast-success",
  error: "hl-toast-error",
  warning: "hl-toast-warning",
  info: "hl-toast-info",
};

const TOAST_ICON: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** RNF-A01 — Notificaciones visuales (toast). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), TOAST_DURATION_MS);
  }, []);

  const value: ToastContextValue = {
    showSuccess: (m) => push("success", m),
    showError: (m) => push("error", m),
    showWarning: (m) => push("warning", m),
    showInfo: (m) => push("info", m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="hl-toast-container" aria-live="polite">
        {toasts.map((t) => {
          const Icon = TOAST_ICON[t.type];
          return (
            <div key={t.id} className={`hl-toast ${TOAST_CLASS[t.type]}`} role="status">
              <Icon size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span className="flex-1">{t.message}</span>
              <button
                type="button"
                className="hl-toast-close"
                aria-label="Cerrar"
                onClick={() => setToasts((x) => x.filter((i) => i.id !== t.id))}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showSuccess: (m: string) => console.info(m),
      showError: (m: string) => console.error(m),
      showWarning: (m: string) => console.warn(m),
      showInfo: (m: string) => console.info(m),
    };
  }
  return ctx;
}
