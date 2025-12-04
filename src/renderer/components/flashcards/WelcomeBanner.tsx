import React, { useState } from 'react';
import { BookOpen, X } from 'lucide-react';

interface WelcomeBannerProps {
  dueCount: number;
  onStartReview: () => void;
}

export function WelcomeBanner({ dueCount, onStartReview }: WelcomeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || dueCount === 0) return null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning!';
    if (hour < 18) return 'Good afternoon!';
    return 'Good evening!';
  };

  return (
    <div 
      className="relative rounded-xl p-5 shadow-sm mb-6"
      style={{ 
        background: 'linear-gradient(to bottom right, rgba(74, 55, 40, 0.05), rgba(74, 55, 40, 0.02), transparent)',
        border: '1px solid rgba(74, 55, 40, 0.2)'
      }}
    >
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
        style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4 pr-8">
        <div 
          className="flex h-11 w-11 items-center justify-center rounded-full mt-0.5"
          style={{ 
            backgroundColor: 'rgba(74, 55, 40, 0.1)',
            border: '1px solid rgba(74, 55, 40, 0.2)'
          }}
        >
          <BookOpen className="h-5 w-5" style={{ color: 'var(--primary, #4a3728)' }} />
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h3 
              className="text-lg font-medium mb-1"
              style={{ color: 'var(--foreground, #1a1a1a)' }}
            >
              {getGreeting()}
            </h3>
            <p 
              className="text-sm"
              style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
            >
              You have{' '}
              <span 
                className="font-semibold"
                style={{ color: 'var(--foreground, #1a1a1a)' }}
              >
                {dueCount}
              </span>{' '}
              {dueCount === 1 ? 'card' : 'cards'} ready for review. Keep your streak going!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onStartReview}
              className="py-2 px-4 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: 'var(--primary, #4a3728)',
                color: 'var(--primary-foreground, #fdfcfa)'
              }}
            >
              Review Now
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="py-2 px-4 rounded-lg font-medium transition-colors hover:bg-black/5"
              style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}





