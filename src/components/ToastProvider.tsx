"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

type ToastType = "success" | "error";

type ToastItem = { id: number; type: ToastType; message: string };

type ToastContextValue = {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** RNF-A01 — Notificaciones visuales (toast). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const value: ToastContextValue = {
    showSuccess: (m) => push("success", m),
    showError: (m) => push("error", m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white"
            style={{ background: t.type === "success" ? "#15803d" : "#b91c1c" }}
            role="status"
          >
            {t.type === "success" ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : <XCircle size={18} className="shrink-0 mt-0.5" />}
            <span className="flex-1">{t.message}</span>
            <button type="button" className="opacity-80 hover:opacity-100" onClick={() => setToasts((x) => x.filter((i) => i.id !== t.id))}>
              <X size={16} />
            </button>
          </div>
        ))}
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
    };
  }
  return ctx;
}
