

import { cn } from '@utils';

import { SidebarBadge } from '../flashcards/SidebarBadge';

interface NavButtonProps {
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  tooltip: string;
  badge?: number;
}

export function NavButton({
  icon,
  isActive,
  onClick,
  tooltip,
  badge,
}: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={cn(
        "w-11 h-11 flex items-center justify-center",
        "border-none rounded-lg cursor-pointer",
        "transition-all duration-150 relative",
        "[--webkit-app-region:no-drag]",
        isActive
          ? "bg-[var(--sidebar-active)] text-[var(--foreground)]"
          : "bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--hover-bg)]"
      )}
      // @ts-expect-error - webkit property for Electron no-drag
      style={{ WebkitAppRegion: 'no-drag' }}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <SidebarBadge count={badge} variant="minimal" />
      )}
    </button>
  );
}

