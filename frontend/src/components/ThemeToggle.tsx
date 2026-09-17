import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className="p-0.5 rounded-xl inline-flex items-center gap-0.5 bg-[#19191f] border border-white/10"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(value)}
            title={`${label} Mode`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-[#25252d] text-[#00d2fd] shadow-md border border-white/10 font-space font-bold'
                : 'text-[#acaab1] hover:text-[#f9f5fd]'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline text-[11px] space-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
};
