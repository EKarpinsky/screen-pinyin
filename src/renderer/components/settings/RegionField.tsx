import { cn } from '@utils';
import { AZURE_REGIONS, AzureRegion } from './types';

interface RegionFieldProps {
  value: AzureRegion;
  onChange: (value: AzureRegion) => void;
}

export function RegionField({ value, onChange }: RegionFieldProps) {
  return (
    <div>
      <label className={cn(
        "block text-sm font-medium",
        "text-[var(--foreground)] mb-2"
      )}>
        Azure Region
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AzureRegion)}
        className={cn(
          "w-full appearance-none",
          "border border-[var(--border)]",
          "bg-[var(--input)] rounded-none",
          "py-3 px-3.5 text-sm",
          "text-[var(--foreground)] font-[inherit]",
          "outline-none cursor-pointer",
          "transition-colors duration-200",
          "focus:border-[var(--foreground)]",
          // Custom dropdown arrow
          "bg-[length:16px] bg-[right_12px_center] bg-no-repeat",
          "bg-[url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b6b6b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")]"
        )}
      >
        {AZURE_REGIONS.map((region) => (
          <option key={region.value} value={region.value}>
            {region.label}
          </option>
        ))}
      </select>
    </div>
  );
}

