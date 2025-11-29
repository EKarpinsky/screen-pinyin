import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TranslationHistory } from '../history'

// Mock history items for testing
const mockHistoryItems = [
  {
    id: '1',
    chinese: '你好',
    pinyin: 'nǐ hǎo',
    english: 'Hello',
    timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
  },
  {
    id: '2',
    chinese: '谢谢',
    pinyin: 'xiè xiè',
    english: 'Thank you',
    timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago
  },
  {
    id: '3',
    chinese: '再见',
    pinyin: 'zài jiàn',
    english: 'Goodbye',
    timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
  },
]

describe('TranslationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('renders loading state when no items are provided and fetching', async () => {
      // Mock getHistory to delay
      window.electronAPI.getHistory = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      )

      render(<TranslationHistory />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('renders empty state with watermark character when items array is empty', async () => {
      render(<TranslationHistory items={[]} />)
      
      // Check for the empty state message
      expect(screen.getByText('未开始')).toBeInTheDocument()
      expect(screen.getByText(/Your translation journey begins here/i)).toBeInTheDocument()
    })
  })

  describe('History Items', () => {
    it('renders history items with chinese, pinyin, and english text', () => {
      render(<TranslationHistory items={mockHistoryItems} />)
      
      // Check that all items are rendered
      expect(screen.getByText('你好')).toBeInTheDocument()
      expect(screen.getByText('nǐ hǎo')).toBeInTheDocument()
      expect(screen.getByText('Hello')).toBeInTheDocument()
      
      expect(screen.getByText('谢谢')).toBeInTheDocument()
      expect(screen.getByText('xiè xiè')).toBeInTheDocument()
      expect(screen.getByText('Thank you')).toBeInTheDocument()
      
      expect(screen.getByText('再见')).toBeInTheDocument()
      expect(screen.getByText('zài jiàn')).toBeInTheDocument()
      expect(screen.getByText('Goodbye')).toBeInTheDocument()
    })

    it('displays correct translation count', () => {
      render(<TranslationHistory items={mockHistoryItems} />)
      
      expect(screen.getByText('3 translations')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('search input filters items by chinese text', async () => {
      const user = userEvent.setup()
      render(<TranslationHistory items={mockHistoryItems} />)
      
      const searchInput = screen.getByPlaceholderText('Search')
      await user.type(searchInput, '你好')
      
      // Should show matching item
      expect(screen.getByText('你好')).toBeInTheDocument()
      expect(screen.getByText('Hello')).toBeInTheDocument()
      
      // Should not show non-matching items
      expect(screen.queryByText('谢谢')).not.toBeInTheDocument()
      expect(screen.queryByText('再见')).not.toBeInTheDocument()
    })

    it('search input filters items by english text', async () => {
      const user = userEvent.setup()
      render(<TranslationHistory items={mockHistoryItems} />)
      
      const searchInput = screen.getByPlaceholderText('Search')
      await user.type(searchInput, 'Thank')
      
      // Should show matching item
      expect(screen.getByText('谢谢')).toBeInTheDocument()
      expect(screen.getByText('Thank you')).toBeInTheDocument()
      
      // Should not show non-matching items
      expect(screen.queryByText('你好')).not.toBeInTheDocument()
    })

    it('search input filters items by pinyin', async () => {
      const user = userEvent.setup()
      render(<TranslationHistory items={mockHistoryItems} />)
      
      const searchInput = screen.getByPlaceholderText('Search')
      await user.type(searchInput, 'zài jiàn')
      
      // Should show matching item
      expect(screen.getByText('再见')).toBeInTheDocument()
      expect(screen.getByText('Goodbye')).toBeInTheDocument()
      
      // Should not show non-matching items
      expect(screen.queryByText('你好')).not.toBeInTheDocument()
    })

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup()
      render(<TranslationHistory items={mockHistoryItems} />)
      
      const searchInput = screen.getByPlaceholderText('Search')
      await user.type(searchInput, 'nonexistent')
      
      expect(screen.getByText(/No translations match/i)).toBeInTheDocument()
    })
  })

  describe('Delete Functionality', () => {
    it('delete button calls onDeleteItem with correct id', async () => {
      const onDeleteItem = vi.fn()
      render(<TranslationHistory items={mockHistoryItems} onDeleteItem={onDeleteItem} />)
      
      // Find all delete buttons (they're hidden by default, shown on hover via CSS)
      const deleteButtons = screen.getAllByRole('button', { name: /delete translation/i })
      
      // Click the first delete button
      fireEvent.click(deleteButtons[0])
      
      expect(onDeleteItem).toHaveBeenCalledTimes(1)
      expect(onDeleteItem).toHaveBeenCalledWith('1')
    })
  })

  describe('Clear All Functionality', () => {
    it('Clear All button calls onClearAll', async () => {
      const onClearAll = vi.fn()
      render(<TranslationHistory items={mockHistoryItems} onClearAll={onClearAll} />)
      
      const clearAllButton = screen.getByRole('button', { name: /clear all/i })
      fireEvent.click(clearAllButton)
      
      expect(onClearAll).toHaveBeenCalledTimes(1)
    })
  })

  describe('Item Click Functionality', () => {
    it('clicking card calls onItemClick with item data', async () => {
      const onItemClick = vi.fn()
      render(<TranslationHistory items={mockHistoryItems} onItemClick={onItemClick} />)
      
      // Click on the first history card (by clicking on the chinese text)
      const chineseText = screen.getByText('你好')
      fireEvent.click(chineseText)
      
      expect(onItemClick).toHaveBeenCalledTimes(1)
      expect(onItemClick).toHaveBeenCalledWith(mockHistoryItems[0])
    })
  })
})

