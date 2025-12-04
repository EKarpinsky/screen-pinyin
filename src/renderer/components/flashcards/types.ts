import type { FlashcardData, FlashcardStats, FlashcardIntervals } from '../../../shared/types';

export type { FlashcardData, FlashcardStats, FlashcardIntervals };

// Card state enum for display purposes
export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

// Rating values matching ts-fsrs Rating enum
export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export interface FlashcardDeckProps {
  onStartReview: () => void;
}

export interface FlashcardReviewProps {
  onComplete: () => void;
  onBack: () => void;
}





