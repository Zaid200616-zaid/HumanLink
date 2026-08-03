import HumanLinkWordmark from "@/components/HumanLinkWordmark";

type Props = {
  className?: string;
  /** Fondo oscuro detrás del wordmark en páginas con fondo claro (login, postular). */
  shell?: boolean;
};

/** Logotipo oficial HumanLink — única fuente de marca en todo el sistema. */
export default function BrandLogo({ className = "", shell = false }: Props) {
  const wordmark = (
    <HumanLinkWordmark className={`hl-brand-logo ${className}`.trim()} />
  );

  if (shell) {
    return <span className="hl-wordmark-shell">{wordmark}</span>;
  }

  return wordmark;
}
