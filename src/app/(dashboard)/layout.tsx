"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import AppTopBar from "@/components/AppTopBar";
import ThemeProvider from "@/components/ThemeProvider";
import DarkModeToggle from "@/components/DarkModeToggle";
import SessionUserIndicator from "@/components/SessionUserIndicator";
import { ToastProvider } from "@/components/ToastProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="app-shell">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {sidebarOpen && (
            <div
              className="app-sidebar-backdrop lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          <div className="app-main">
            <AppTopBar
              showMenuButton
              onMenuOpen={() => setSidebarOpen(true)}
              trailing={
                <>
                  <div className="lg:hidden">
                    <SessionUserIndicator compact />
                  </div>
                  <div className="hidden lg:block">
                    <SessionUserIndicator />
                  </div>
                  <DarkModeToggle />
                </>
              }
            />
            <div className="app-main-content">{children}</div>
          </div>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
