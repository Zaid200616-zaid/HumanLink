"use client";

import { useState } from "react";

interface AvatarProps {
  nombre: string;
  apellido?: string;
  fotoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-lg",
  xl: "w-24 h-24 text-2xl",
};

export default function Avatar({ nombre, apellido, fotoUrl, size = "md", className = "" }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const iniciales = `${nombre.charAt(0)}${apellido?.charAt(0) || ""}`.toUpperCase();
  const sizeClass = sizes[size];

  if (fotoUrl && !imgFailed) {
    return (
      <img
        src={fotoUrl}
        alt={`${nombre} ${apellido || ""}`}
        className={`${sizeClass} rounded-full object-cover border-2 border-white shadow ${className}`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shadow ${className}`}
      style={{ background: "var(--color-primary, #1B4F72)" }}
    >
      {iniciales}
    </div>
  );
}
