import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-brand",
});

export const metadata: Metadata = {
  title: "HumanLink - Sistema de Gestión de Recursos Humanos",
  description:
    "Plataforma web para administrar empleados, contrataciones, capacitaciones y asistencias",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={plusJakarta.variable}>
      <body className={`${plusJakarta.className} antialiased min-h-screen`}>{children}</body>
    </html>
  );
}

export const viewport = {
  themeColor: "#0a0c10",
};
