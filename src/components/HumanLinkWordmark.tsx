type Props = {
  className?: string;
};

/**
 * Logotipo tipográfico HumanLink — texto puro, sin imágenes ni variantes.
 * Mismo aspecto en navbar, login, sidebar, dashboard, footer y landing.
 */
export default function HumanLinkWordmark({ className = "" }: Props) {
  return (
    <span className={`hl-wordmark ${className}`.trim()} role="img" aria-label="HumanLink">
      <span className="hl-wordmark-human">Human</span>
      <span className="hl-wordmark-link">Link</span>
    </span>
  );
}
