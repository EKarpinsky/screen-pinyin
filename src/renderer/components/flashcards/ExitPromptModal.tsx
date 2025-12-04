import React from 'react';
import { BookOpen, Clock, X } from 'lucide-react';

interface ExitPromptModalProps {
  open: boolean;
  dueCount: number;
  onStartReview: () => void;
  onDismiss: () => void;
  onClose: () => void;
}

export function ExitPromptModal({
  open,
  dueCount,
  onStartReview,
  onDismiss,
  onClose,
}: ExitPromptModalProps) {
  if (!open) return null;

  // Estimate 20 seconds per card
  const estimatedMinutes = Math.max(1, Math.ceil((dueCount * 20) / 60));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative max-w-md w-full mx-4 rounded-xl shadow-xl"
        style={{ 
          backgroundColor: 'var(--card, #fdfcfa)',
          border: '1px solid var(--border, #e5e5e5)'
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-lg hover:bg-black/5 transition-colors"
          style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-8">
          {/* Icon */}
          <div 
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-6"
            style={{ 
              backgroundColor: 'rgba(74, 55, 40, 0.05)',
              border: '1px solid rgba(74, 55, 40, 0.1)'
            }}
          >
            <BookOpen className="h-7 w-7" style={{ color: 'var(--primary, #4a3728)' }} />
          </div>

          {/* Title */}
          <h2 
            className="text-center text-2xl font-medium mb-4"
            style={{ color: 'var(--foreground, #1a1a1a)' }}
          >
            Quick review before you go?
          </h2>

          {/* Stats */}
          <div 
            className="flex items-center justify-center gap-3 text-base mb-3"
            style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
          >
            <span className="font-semibold" style={{ color: 'var(--foreground, #1a1a1a)' }}>
              {dueCount} {dueCount === 1 ? 'card' : 'cards'}
            </span>
            <span style={{ color: 'var(--border, #e5e5e5)' }}>•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>
                ~{estimatedMinutes} {estimatedMinutes === 1 ? 'minute' : 'minutes'}
              </span>
            </div>
          </div>

          <p 
            className="text-sm text-center mb-6"
            style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
          >
            A quick session now will help reinforce your learning
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onStartReview}
              className="w-full py-3 px-4 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: 'var(--primary, #4a3728)',
                color: 'var(--primary-foreground, #fdfcfa)'
              }}
            >
              Let's do it
            </button>
            <button
              onClick={onDismiss}
              className="w-full py-3 px-4 rounded-lg font-medium transition-colors hover:bg-black/5"
              style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}




