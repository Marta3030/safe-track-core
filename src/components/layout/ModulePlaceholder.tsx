import type { LucideIcon } from "lucide-react";

type ModulePlaceholderProps = {
  icon: LucideIcon;
  phase: string;
  description: string;
  scope: readonly string[];
};

/**
 * Estado inicial de los módulos aún no implementados.
 * Declara explícitamente el alcance comprometido para cada fase.
 */
export function ModulePlaceholder({
  icon: Icon,
  phase,
  description,
  scope,
}: ModulePlaceholderProps) {
  return (
    <div className="surface-card mx-auto max-w-2xl p-6 md:p-8">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="eyebrow mt-4">{phase}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground md:text-base">
        {description}
      </p>
      <ul className="mt-5 space-y-2 border-t border-border pt-5">
        {scope.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
