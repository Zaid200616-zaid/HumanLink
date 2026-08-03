"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function DarkModeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    fetch("/api/perfil/preferencias")
      .then((r) => r.json())
      .then((p) => {
        const isLight = p.tema === "light";
        setLight(isLight);
        document.documentElement.classList.toggle("light", isLight);
      })
      .catch(() => {});
  }, []);

  async function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    await fetch("/api/perfil/preferencias", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tema: next ? "light" : "dark" }),
    });
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl transition-colors"
      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
      title="Cambiar tema"
    >
      {light ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
