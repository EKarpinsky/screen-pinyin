import { Check, Eye, EyeOff } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { cn } from '@utils';

import { ScrollArea } from './ui/scroll-area';

const AZURE_REGIONS = [
  { value: 'eastus', label: 'East US' },
  { value: 'westus', label: 'West US' },
  { value: 'westus2', label: 'West US 2' },
  { value: 'eastasia', label: 'East Asia' },
  { value: 'southeastasia', label: 'Southeast Asia' },
  { value: 'northeurope', label: 'North Europe' },
  { value: 'westeurope', label: 'West Europe' },
] as const;

export function SettingsPanel() {
  const [apiKey, setApiKey] = useState('');
  const [region, setRegion] = useState('eastus');
  const [showApiKey, setShowApiKey] = useState(false);
  const [clipboardMonitor, setClipboardMonitor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedApiKey = await window.electronAPI.getStoreValue('azureApiKey') as string;
        const storedRegion = await window.electronAPI.getStoreValue('azureRegion') as string;
        const monitorStatus = await window.electronAPI.getClipboardMonitorStatus?.();
        if (storedApiKey) setApiKey(storedApiKey);
        if (storedRegion) setRegion(storedRegion);
        setClipboardMonitor(monitorStatus || false);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleToggleClipboardMonitor = async () => {
    const newValue = !clipboardMonitor;
    setClipboardMonitor(newValue);
    try {
      await window.electronAPI.toggleClipboardMonitor?.(newValue);
    } catch (err) {
      console.error('Failed to toggle clipboard monitor:', err);
      setClipboardMonitor(!newValue);
    }
  };

  const handleSave = async () => {
    await window.electronAPI.setStoreValue('azureApiKey', apiKey);
    await window.electronAPI.setStoreValue('azureRegion', region);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--muted-foreground)]">
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-7 px-9 animate-[fadeIn_0.3s_ease-out]">
        {/* Header */}
        <div className="mb-7">
          <h2 className="text-[1.35rem] font-medium text-[var(--foreground)] m-0">
            Settings
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1 m-0">
            Configure your Azure Translator connection
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-5 max-w-[480px]">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Azure API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className={cn(
                  "w-full border border-[var(--border)]",
                  "bg-[var(--input)] rounded-none",
                  "py-3 pl-3.5 pr-11 text-sm",
                  "text-[var(--foreground)] font-[inherit]",
                  "outline-none transition-colors duration-200",
                  "focus:border-[var(--foreground)]",
                  "placeholder:text-[var(--muted-foreground)]"
                )}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2",
                  "bg-transparent border-0 p-1",
                  "text-[var(--muted-foreground)] cursor-pointer",
                  "flex items-center justify-center",
                  "hover:text-[var(--foreground)] transition-colors"
                )}
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Azure Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={cn(
                "w-full appearance-none",
                "border border-[var(--border)]",
                "bg-[var(--input)] rounded-none",
                "py-3 px-3.5 text-sm",
                "text-[var(--foreground)] font-[inherit]",
                "outline-none cursor-pointer",
                "transition-colors duration-200",
                "focus:border-[var(--foreground)]",
                "bg-[length:16px] bg-[right_12px_center] bg-no-repeat",
                "bg-[url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b6b6b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")]"
              )}
            >
              {AZURE_REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Hotkey Display */}
          <div className="border border-[var(--border)] bg-[var(--hover-bg)] p-4">
            <div
              className={cn(
                "text-[0.7rem] font-semibold uppercase",
                "tracking-[0.1em] text-[var(--muted-foreground)]",
                "mb-2.5"
              )}
            >
              Capture Hotkey
            </div>
            <div className="flex items-center gap-2">
              {['Ctrl', 'Shift', 'C'].map((key, i) => (
                <div key={key} className="flex items-center gap-2">
                  {i > 0 && <span className="text-[var(--muted-foreground)]">+</span>}
                  <kbd
                    className={cn(
                      "border border-[var(--border)]",
                      "bg-[var(--card)] px-2.5 py-1",
                      "text-[0.8rem] font-medium",
                      "font-mono text-[var(--foreground)]"
                    )}
                  >
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Clipboard Monitor Toggle */}
          <div className="border-t border-[var(--border)] pt-5 mt-1">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Quick Pinyin Lookup
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  Alt+P to show pinyin for copied text
                </span>
              </div>
              <button
                onClick={handleToggleClipboardMonitor}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2",
                  clipboardMonitor ? "bg-[var(--primary)]" : "bg-[var(--muted)]"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm",
                    "transition-transform duration-200",
                    clipboardMonitor ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className={cn(
              "border border-[var(--foreground)]",
              "bg-[var(--foreground)] py-3.5 px-5",
              "text-sm font-medium",
              "text-[var(--card)] cursor-pointer",
              "font-[inherit] transition-opacity duration-200",
              "flex items-center justify-center gap-2",
              "hover:opacity-90"
            )}
          >
            {saved && <Check size={16} />}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </ScrollArea>
  );
}

