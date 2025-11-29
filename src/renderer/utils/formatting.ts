/**
 * Utility functions for formatting dates, times, and text display
 */

/**
 * Format a timestamp to a short date string (e.g., "NOV 29")
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const day = date.getDate()
  return `${month} ${day}`
}

/**
 * Format a timestamp to a time string (e.g., "3:45 PM")
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

/**
 * Get dynamic font size based on text length - shorter text = bigger font
 * Used for displaying Chinese characters at appropriate sizes
 */
export function getDynamicFontSize(text: string): string {
  const len = text.length
  if (len <= 2) return '5rem'
  if (len <= 4) return '3.5rem'
  if (len <= 8) return '2.5rem'
  if (len <= 12) return '1.8rem'
  return '1.5rem'
}

/**
 * Get relative time string (e.g., "5 min ago", "2 hours ago")
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return new Date(timestamp).toLocaleDateString()
}

