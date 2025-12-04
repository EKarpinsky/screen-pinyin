import React from 'react';

interface SidebarBadgeProps {
  count: number;
  variant?: 'default' | 'minimal';
}

export function SidebarBadge({ count, variant = 'default' }: SidebarBadgeProps) {
  if (count === 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  if (variant === 'minimal') {
    return (
      <span 
        className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-sm"
        style={{ backgroundColor: 'var(--chart-1, #3b82f6)' }}
      >
        {displayCount}
      </span>
    );
  }

  return (
    <span 
      className="ml-auto h-5 min-w-5 rounded-full px-1.5 text-[11px] font-semibold flex items-center justify-center"
      style={{ 
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        color: 'var(--chart-1, #3b82f6)',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}
    >
      {displayCount}
    </span>
  );
}





