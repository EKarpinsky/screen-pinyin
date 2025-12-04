import React from 'react';
import { Flame, Award, TrendingUp } from 'lucide-react';

interface StreakStatsProps {
  currentStreak: number;
  longestStreak: number;
  totalMastered: number;
  variant?: 'compact' | 'full';
}

export function StreakStats({ 
  currentStreak, 
  longestStreak, 
  totalMastered, 
  variant = 'full' 
}: StreakStatsProps) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Flame 
            className="h-4 w-4" 
            style={{ color: currentStreak > 0 ? 'var(--chart-2, #f97316)' : 'rgba(var(--muted-foreground), 0.4)' }} 
          />
          <span 
            className="text-sm font-semibold"
            style={{ color: 'var(--foreground, #1a1a1a)' }}
          >
            {currentStreak}
          </span>
          <span 
            className="text-xs"
            style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
          >
            day streak
          </span>
        </div>

        <div 
          className="h-4 w-px"
          style={{ backgroundColor: 'var(--border, #e5e5e5)' }}
        />

        <div className="flex items-center gap-1.5">
          <Award className="h-4 w-4" style={{ color: 'var(--chart-3, #22c55e)' }} />
          <span 
            className="text-sm font-semibold"
            style={{ color: 'var(--foreground, #1a1a1a)' }}
          >
            {totalMastered}
          </span>
          <span 
            className="text-xs"
            style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
          >
            mastered
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Current Streak */}
      <div 
        className="rounded-lg p-4 space-y-3"
        style={{ 
          backgroundColor: 'rgba(var(--card), 0.5)',
          border: '1px solid rgba(var(--border), 0.5)'
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ 
              backgroundColor: currentStreak > 0 ? 'rgba(249, 115, 22, 0.1)' : 'rgba(var(--muted), 0.5)',
              border: currentStreak > 0 ? '1px solid rgba(249, 115, 22, 0.2)' : '1px solid rgba(var(--border), 0.3)'
            }}
          >
            <Flame 
              className="h-5 w-5" 
              style={{ color: currentStreak > 0 ? 'var(--chart-2, #f97316)' : 'rgba(var(--muted-foreground), 0.4)' }} 
            />
          </div>
          <div>
            <div 
              className="text-2xl font-semibold"
              style={{ color: 'var(--foreground, #1a1a1a)' }}
            >
              {currentStreak}
            </div>
            <div 
              className="text-xs"
              style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
            >
              day streak
            </div>
          </div>
        </div>

        {currentStreak > 0 && (
          <div 
            className="text-xs"
            style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
          >
            Keep it up! Review today to continue
          </div>
        )}
      </div>

      {/* Longest Streak */}
      <div 
        className="rounded-lg p-4 space-y-3"
        style={{ 
          backgroundColor: 'rgba(var(--card), 0.5)',
          border: '1px solid rgba(var(--border), 0.5)'
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ 
              backgroundColor: 'rgba(74, 55, 40, 0.05)',
              border: '1px solid rgba(74, 55, 40, 0.1)'
            }}
          >
            <TrendingUp className="h-5 w-5" style={{ color: 'var(--primary, #4a3728)' }} />
          </div>
          <div>
            <div 
              className="text-2xl font-semibold"
              style={{ color: 'var(--foreground, #1a1a1a)' }}
            >
              {longestStreak}
            </div>
            <div 
              className="text-xs"
              style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
            >
              best streak
            </div>
          </div>
        </div>
      </div>

      {/* Total Mastered */}
      <div 
        className="rounded-lg p-4 space-y-3"
        style={{ 
          backgroundColor: 'rgba(var(--card), 0.5)',
          border: '1px solid rgba(var(--border), 0.5)'
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ 
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)'
            }}
          >
            <Award className="h-5 w-5" style={{ color: 'var(--chart-3, #22c55e)' }} />
          </div>
          <div>
            <div 
              className="text-2xl font-semibold"
              style={{ color: 'var(--foreground, #1a1a1a)' }}
            >
              {totalMastered}
            </div>
            <div 
              className="text-xs"
              style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
            >
              mastered
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




