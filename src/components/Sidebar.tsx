"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { getNavForRole } from "@/lib/roles";

export default function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [rol, setRol] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.rol) setRol(data.rol);
        if (data.email) setEmail(data.email);
      });
  }, []);

  const navGroups = rol ? getNavForRole(rol) : {};

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <aside
      className={`app-sidebar ${open ? "app-sidebar--open" : ""}`}
      aria-label="Menú principal"
    >
      <div className="app-sidebar-brand">
        <Link href="/dashboard" className="app-sidebar-brand-link" onClick={onClose}>
          <BrandLogo />
        </Link>
        <p className="app-sidebar-role">{rol || "Cargando…"}</p>
        {email && <p className="app-sidebar-email">{email}</p>}
      </div>

      <nav className="app-sidebar-nav">
        {Object.entries(navGroups).map(([group, items]) => (
          <div key={group} className="app-sidebar-group">
            <p className="app-sidebar-group-label">{group}</p>
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`app-sidebar-link${active ? " app-sidebar-link--active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="app-sidebar-footer">
        <button type="button" onClick={logout} className="app-sidebar-logout">
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
