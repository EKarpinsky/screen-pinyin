import { cn } from '@utils';

interface SettingsHeaderProps {
  title: string;
  subtitle: string;
}

export function SettingsHeader({ title, subtitle }: SettingsHeaderProps) {
  return (
    <div className="mb-8 animate-[fadeIn_0.4s_ease-out]">
      <h2 className={cn(
        "text-2xl font-semibold text-[var(--foreground)]",
        "m-0 tracking-tight"
      )}>
        {title}
      </h2>
      <p className={cn(
        "text-sm text-[var(--muted-foreground)]",
        "mt-1 m-0"
      )}>
        {subtitle}
      </p>
    </div>
  );
}

