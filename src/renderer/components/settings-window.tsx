import { useState, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"

const colors = {
  background: '#f7f5f0',
  card: '#fdfcfa',
  foreground: '#1a1a1a',
  muted: '#6b6b6b',
  border: '#d4d0c8',
  input: '#efece6',
}

const AZURE_REGIONS = [
  { value: "eastus", label: "East US" },
  { value: "westus", label: "West US" },
  { value: "westus2", label: "West US 2" },
  { value: "eastasia", label: "East Asia" },
  { value: "southeastasia", label: "Southeast Asia" },
  { value: "northeurope", label: "North Europe" },
  { value: "westeurope", label: "West Europe" },
]

export function SettingsWindow() {
  const [apiKey, setApiKey] = useState("")
  const [region, setRegion] = useState("eastus")
  const [showApiKey, setShowApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedApiKey = await window.electronAPI.getStoreValue('azureApiKey') as string
        const storedRegion = await window.electronAPI.getStoreValue('azureRegion') as string
        if (storedApiKey) setApiKey(storedApiKey)
        if (storedRegion) setRegion(storedRegion)
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    await window.electronAPI.setStoreValue('azureApiKey', apiKey)
    await window.electronAPI.setStoreValue('azureRegion', region)
    window.electronAPI.closeSettings()
  }

  const handleClose = () => {
    window.electronAPI.closeSettings()
  }

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.card,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center', color: colors.muted }}>
          <div style={{ fontSize: 14 }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.card,
      padding: '40px 48px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{
          fontSize: 24,
          fontWeight: 600,
          color: colors.foreground,
          margin: 0,
        }}>
          Settings
        </h2>
        <p style={{
          fontSize: 14,
          color: colors.muted,
          marginTop: 4,
          margin: 0,
        }}>
          Configure your Azure OCR connection
        </p>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* API Key */}
        <div>
          <label style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            color: colors.foreground,
            marginBottom: 8,
          }}>
            Azure API Key
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              style={{
                width: '100%',
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.input,
                padding: '12px 44px 12px 14px',
                fontSize: 14,
                color: colors.foreground,
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = colors.foreground}
              onBlur={(e) => e.currentTarget.style.borderColor = colors.border}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: colors.muted,
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
              }}
            >
              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Region */}
        <div>
          <label style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            color: colors.foreground,
            marginBottom: 8,
          }}>
            Azure Region
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{
              width: '100%',
              appearance: 'none',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.input,
              padding: '12px 14px',
              fontSize: 14,
              color: colors.foreground,
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer',
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b6b6b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 12px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '16px',
            }}
          >
            {AZURE_REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Hotkey Display */}
        <div style={{
          border: `1px solid ${colors.border}`,
          backgroundColor: 'rgba(232, 228, 220, 0.3)',
          padding: 16,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: colors.muted,
            marginBottom: 12,
          }}>
            Capture Hotkey
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {['Ctrl', 'Shift', 'C'].map((key, i) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {i > 0 && <span style={{ color: colors.muted }}>+</span>}
                <kbd style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.card,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: '"Consolas", monospace',
                  color: colors.foreground,
                }}>
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1,
              border: `1px solid ${colors.border}`,
              backgroundColor: 'transparent',
              padding: '14px 20px',
              fontSize: 14,
              fontWeight: 500,
              color: colors.foreground,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.input}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              border: `1px solid ${colors.foreground}`,
              backgroundColor: colors.foreground,
              padding: '14px 20px',
              fontSize: 14,
              fontWeight: 500,
              color: colors.card,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
