import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** Variante para fondos oscuros (sidebar / login) o claros (reportes). */
  tone?: "dark" | "light";
  showWordmark?: boolean;
};

/**
 * Marca provisional de Safety360 HSEQ.
 * Se reemplaza por el archivo de logo definitivo cuando esté disponible.
 */
export function Logo({ className, tone = "dark", showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 40 40"
        className="h-9 w-9 shrink-0"
        role="img"
        aria-label="Safety360 HSEQ"
      >
        <path
          d="M20 2.5 34.5 7.4v13.1c0 8.3-5.6 15-14.5 17.9C11.1 35.5 5.5 28.8 5.5 20.5V7.4L20 2.5Z"
          fill="currentColor"
          className="text-primary"
        />
        <path
          d="M20 6.6 30.6 10.2v10.3c0 6.4-4.2 11.6-10.6 13.9-6.4-2.3-10.6-7.5-10.6-13.9V10.2L20 6.6Z"
          className={tone === "dark" ? "fill-sidebar" : "fill-card"}
        />
        <circle
          cx="20"
          cy="20"
          r="6.2"
          fill="none"
          strokeWidth="2.4"
          className="stroke-primary"
          strokeDasharray="29 10"
          strokeLinecap="round"
        />
      </svg>
      {showWordmark && (
        <span
          className={cn(
            "font-display text-base leading-none font-bold tracking-tight",
            tone === "dark" ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          Safety<span className="text-primary">360</span>
          <span className="block text-[0.625rem] font-semibold tracking-[0.22em] text-muted-foreground">
            HSEQ
          </span>
        </span>
      )}
    </div>
  );
}
