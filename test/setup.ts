import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.electronAPI for renderer tests
Object.defineProperty(window, 'electronAPI', {
  value: {
    getHistory: vi.fn().mockResolvedValue([]),
    deleteHistoryItem: vi.fn().mockResolvedValue(),
    clearHistory: vi.fn().mockResolvedValue(),
    showResultsWithData: vi.fn().mockResolvedValue(),
    // Add other API methods as needed
    getSettings: vi.fn().mockResolvedValue({ azureApiKey: '', azureRegion: 'eastus' }),
    saveSettings: vi.fn().mockResolvedValue(),
    performOCR: vi.fn().mockResolvedValue({ success: true, text: '' }),
    translate: vi.fn().mockResolvedValue({ success: true, translation: '', pinyin: '' }),
    getCapturedImage: vi.fn().mockResolvedValue(null),
    segmentText: vi.fn().mockResolvedValue([]),
  },
  writable: true,
})

