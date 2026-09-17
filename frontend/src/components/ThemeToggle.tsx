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
      className="p-0.5 rounded-lg inline-flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.08]"
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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-white/10 text-cyan-400 shadow-sm border border-white/10 font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline text-[11px]">{label}</span>
          </button>
        );
      })}
    </div>
  );
};
