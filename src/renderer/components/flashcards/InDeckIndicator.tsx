import { Check, Clock, Zap } from 'lucide-react';


interface InDeckIndicatorProps {
  isInDeck: boolean;
  nextDue?: string; // ISO date string
  strength?: number; // 0-100 mastery percentage
  variant?: 'full' | 'compact';
}

export function InDeckIndicator({ 
  isInDeck, 
  nextDue, 
  strength = 0, 
  variant = 'full' 
}: InDeckIndicatorProps) {
  if (!isInDeck) return null;

  const getDueStatus = () => {
    if (!nextDue) return { text: 'Not scheduled', isDue: false };

    const now = new Date();
    const dueDate = new Date(nextDue);
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Due now', isDue: true };
    if (diffDays === 0) return { text: 'Due today', isDue: true };
    if (diffDays === 1) return { text: 'Review tomorrow', isDue: false };
    if (diffDays < 7) return { text: `Review in ${diffDays} days`, isDue: false };
    if (diffDays < 30) return { text: `Review in ${Math.floor(diffDays / 7)} weeks`, isDue: false };
    return { text: `Review in ${Math.floor(diffDays / 30)} months`, isDue: false };
  };

  const dueStatus = getDueStatus();

  if (variant === 'compact') {
    return (
      <span 
        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
        style={{ 
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          color: 'var(--chart-3, #22c55e)',
          border: '1px solid rgba(34, 197, 94, 0.2)'
        }}
      >
        <Check className="h-3 w-3 mr-1" />
        In Deck
      </span>
    );
  }

  return (
    <div 
      className="rounded-lg p-3 space-y-2.5"
      style={{ 
        backgroundColor: 'rgba(var(--card), 0.5)',
        border: '1px solid rgba(var(--border), 0.5)'
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ 
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)'
            }}
          >
            <Check className="h-4 w-4" style={{ color: 'var(--chart-3, #22c55e)' }} />
          </div>
          <span 
            className="text-sm font-medium"
            style={{ color: 'var(--foreground, #1a1a1a)' }}
          >
            In Your Deck
          </span>
        </div>

        {nextDue && (
          <div 
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: dueStatus.isDue ? 'var(--chart-1, #3b82f6)' : 'var(--muted-foreground, #6b6b6b)' }}
          >
            {dueStatus.isDue ? (
              <Zap className="h-3.5 w-3.5" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            {dueStatus.text}
          </div>
        )}
      </div>

      {/* Strength indicator */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'var(--muted-foreground, #6b6b6b)' }}>Mastery</span>
          <span 
            className="font-medium"
            style={{ color: 'var(--foreground, #1a1a1a)' }}
          >
            {strength}%
          </span>
        </div>
        <div 
          className="h-1.5 w-full rounded-full"
          style={{ backgroundColor: 'rgba(var(--muted), 0.5)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${strength}%`,
              background: 'linear-gradient(to right, var(--chart-2, #f97316), var(--chart-3, #22c55e))'
            }}
          />
        </div>
      </div>
    </div>
  );
}






