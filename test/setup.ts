import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.electronAPI for renderer tests
Object.defineProperty(window, 'electronAPI', {
  value: {
    getHistory: vi.fn().mockResolvedValue([]),
    deleteHistoryItem: vi.fn().mockResolvedValue(undefined),
    clearHistory: vi.fn().mockResolvedValue(undefined),
    showResultsWithData: vi.fn().mockResolvedValue(undefined),
    // Add other API methods as needed
    getSettings: vi.fn().mockResolvedValue({ azureApiKey: '', azureRegion: 'eastus' }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    performOCR: vi.fn().mockResolvedValue({ success: true, text: '' }),
    translate: vi.fn().mockResolvedValue({ success: true, translation: '', pinyin: '' }),
    getCapturedImage: vi.fn().mockResolvedValue(null),
    segmentText: vi.fn().mockResolvedValue([]),
  },
  writable: true,
})

