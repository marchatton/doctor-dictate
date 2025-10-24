import React from 'react';

interface TranscriptionMode {
  key: string;
  label: string;
  description?: string;
  details?: string[];
  badge?: string;
}

interface TranscriptionModeSelectorProps {
  modes: TranscriptionMode[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

export function TranscriptionModeSelector({
  modes,
  selectedKey,
  onSelect,
}: TranscriptionModeSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {modes.map((mode) => {
        const isSelected = mode.key === selectedKey;
        return (
          <button
            key={mode.key}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(mode.key)}
            className={`text-left rounded-xl border transition-all duration-200 p-4 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              isSelected
                ? 'border-amber-600 bg-amber-50 shadow-sm'
                : 'border-stone-200 bg-white hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-semibold text-stone-900">{mode.label}</span>
              {mode.badge ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                  {mode.badge}
                </span>
              ) : null}
            </div>
            {mode.description ? (
              <p className="text-sm text-stone-600 mb-2">{mode.description}</p>
            ) : null}
            {Array.isArray(mode.details) && mode.details.length > 0 ? (
              <ul className="text-xs text-stone-500 space-y-1">
                {mode.details.map((detail) => (
                  <li key={detail} className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
