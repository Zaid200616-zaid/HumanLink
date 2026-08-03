"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

/** Encabezado superior unificado del panel administrativo. */
export default function AppTopBar({
  onMenuOpen,
  showMenuButton = false,
  trailing,
}: {
  onMenuOpen?: () => void;
  showMenuButton?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <header className="app-topbar">
      <div className="app-topbar-start">
        {showMenuButton && (
          <button
            type="button"
            onClick={onMenuOpen}
            className="app-topbar-menu-btn lg:hidden"
            aria-label="Abrir menú"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <Link href="/dashboard" className="app-topbar-brand" aria-label="HumanLink — inicio">
          <BrandLogo />
        </Link>
      </div>
      {trailing && <div className="app-topbar-end">{trailing}</div>}
    </header>
  );
}
