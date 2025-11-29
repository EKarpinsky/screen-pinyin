import { cn } from '@utils';
import { Eye, EyeOff } from 'lucide-react';

interface ApiKeyFieldProps {
  value: string;
  onChange: (value: string) => void;
  showKey: boolean;
  onToggleShow: () => void;
}

export function ApiKeyField({ value, onChange, showKey, onToggleShow }: ApiKeyFieldProps) {
  return (
    <div>
      <label className={cn(
        "block text-sm font-medium",
        "text-[var(--foreground)] mb-2"
      )}>
        Azure API Key
      </label>
      <div className="relative">
        <input
          type={showKey ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
          onClick={onToggleShow}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2",
            "bg-transparent border-0 p-1",
            "text-[var(--muted-foreground)] cursor-pointer",
            "flex items-center justify-center",
            "hover:text-[var(--foreground)] transition-colors"
          )}
        >
          {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

