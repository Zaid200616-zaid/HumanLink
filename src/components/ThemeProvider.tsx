"use client";

import { useEffect } from "react";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    fetch("/api/perfil/preferencias")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        document.documentElement.classList.toggle("light", p?.tema === "light");
      })
      .catch(() => {});
  }, []);

  return <>{children}</>;
}
