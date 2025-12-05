// Color constants for results-view components
// Uses CSS variables for dark mode compatibility

export const colors = {
  background: 'var(--background)',
  card: 'var(--card)',
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  border: 'var(--border)',
  input: 'var(--input)',
  primary: 'var(--primary)',
  
  // Highlight for words (fix for pre-existing lint error)
  wordHighlight: 'var(--accent-bg)',
  
  // POS colors (work well on both light and dark backgrounds)
  verb: 'rgba(59, 130, 246, 0.9)',        // Blue
  noun: 'rgba(217, 119, 6, 0.9)',          // Amber
  adjective: 'rgba(34, 197, 94, 0.9)',     // Green  
  adverb: 'rgba(168, 85, 247, 0.9)',       // Purple
  
  // Hover backgrounds for POS
  verbHover: 'rgba(59, 130, 246, 0.12)',
  nounHover: 'rgba(217, 119, 6, 0.12)',
  adjectiveHover: 'rgba(34, 197, 94, 0.12)',
  adverbHover: 'rgba(168, 85, 247, 0.12)',
};


