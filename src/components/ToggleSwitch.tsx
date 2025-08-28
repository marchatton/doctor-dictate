import React from 'react';
interface ToggleSwitchProps {
  label: string;
  secondaryLabel?: string;
  isChecked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}
export function ToggleSwitch({
  label,
  secondaryLabel,
  isChecked,
  onChange,
  disabled = false
}: ToggleSwitchProps) {
  return <div className="flex flex-col items-end">
      <label className="inline-flex items-center cursor-pointer select-none">
        <input type="checkbox" className="sr-only peer" checked={isChecked} onChange={e => onChange(e.target.checked)} disabled={disabled} />
        <div className="relative w-14 h-7 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:bg-[#6B1F1F] peer-focus:ring-2 peer-focus:ring-[#6B1F1F]/50 peer-disabled:opacity-70 transition-colors shadow-inner">
          <div className="absolute inset-y-0.5 bg-white w-6 h-6 rounded-full shadow-md transition-all duration-300 flex items-center justify-center" style={{
          left: isChecked ? 'calc(100% - 26px)' : '2px'
        }}>
            {isChecked && <svg className="w-3 h-3 text-[#6B1F1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>}
          </div>
        </div>
        <span className="ml-3 text-sm font-medium text-stone-900">{label}</span>
      </label>
      {secondaryLabel && <span className="text-xs text-stone-500 mt-1 italic">
          {secondaryLabel}
        </span>}
    </div>;
}