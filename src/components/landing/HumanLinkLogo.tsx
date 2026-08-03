import BrandLogo from "@/components/BrandLogo";

type Props = {
  className?: string;
  shell?: boolean;
};

/** Alias de landing → logotipo global de marca. */
export default function HumanLinkLogo({ className, shell }: Props) {
  return <BrandLogo className={className} shell={shell} />;
}
