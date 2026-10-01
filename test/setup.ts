import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock window.electronAPI for renderer tests
Object.defineProperty(window, 'electronAPI', {
  value: {
    getHistory: vi.fn().mockResolvedValue([]),
    deleteHistoryItem: vi.fn().mockResolvedValue({ success: true }),
    clearHistory: vi.fn().mockResolvedValue({ success: true }),
    showResultsWithData: vi.fn(async () => {}),
    // Add other API methods as needed
    getSettings: vi.fn().mockResolvedValue({ azureApiKey: '', azureRegion: 'eastus' }),
    saveSettings: vi.fn().mockResolvedValue({ success: true }),
    performOCR: vi.fn().mockResolvedValue({ success: true, text: '' }),
    translate: vi.fn().mockResolvedValue({ success: true, translation: '', pinyin: '' }),
    getCapturedImage: vi.fn().mockResolvedValue(null),
    segmentText: vi.fn().mockResolvedValue([]),
  },
  writable: true,
})
