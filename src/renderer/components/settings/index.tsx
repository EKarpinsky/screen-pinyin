import { useState, useEffect } from 'react';
import { cn } from '@utils';
import { SettingsHeader } from './SettingsHeader';
import { ApiKeyField } from './ApiKeyField';
import { RegionField } from './RegionField';
import { HotkeyDisplay } from './HotkeyDisplay';
import { SettingsActions } from './SettingsActions';
import { AzureRegion } from './types';

export function SettingsWindow() {
  const [apiKey, setApiKey] = useState('');
  const [region, setRegion] = useState<AzureRegion>('eastus');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedApiKey = await window.electronAPI.getStoreValue('azureApiKey') as string;
        const storedRegion = await window.electronAPI.getStoreValue('azureRegion') as string;
        if (storedApiKey) setApiKey(storedApiKey);
        if (storedRegion) setRegion(storedRegion as AzureRegion);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    await window.electronAPI.setStoreValue('azureApiKey', apiKey);
    await window.electronAPI.setStoreValue('azureRegion', region);
    window.electronAPI.closeSettings();
  };

  const handleClose = () => {
    window.electronAPI.closeSettings();
  };

  if (isLoading) {
    return (
      <div className={cn(
        "min-h-screen bg-[var(--card)]",
        "flex items-center justify-center",
        "font-['Segoe_UI',system-ui,-apple-system,sans-serif]"
      )}>
        <div className="text-center text-[var(--muted-foreground)]">
          <div className="text-sm animate-[pulseFade_2s_ease-in-out_infinite]">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-[var(--card)]",
      "p-10 px-12",
      "font-['Segoe_UI',system-ui,-apple-system,sans-serif]",
      "animate-[scaleIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
    )}>
      <SettingsHeader
        title="Settings"
        subtitle="Configure your Azure OCR connection"
      />

      <div className="flex flex-col gap-6">
        <ApiKeyField
          value={apiKey}
          onChange={setApiKey}
          showKey={showApiKey}
          onToggleShow={() => setShowApiKey(!showApiKey)}
        />

        <RegionField
          value={region}
          onChange={setRegion}
        />

        <HotkeyDisplay />

        <SettingsActions
          onCancel={handleClose}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

// Re-export for consumers
export type { AzureRegion } from './types';
export { AZURE_REGIONS } from './types';

