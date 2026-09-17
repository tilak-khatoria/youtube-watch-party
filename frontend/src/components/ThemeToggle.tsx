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
      aria-label="Theme selector"
      className="inline-flex items-center p-0.5 rounded-xl bg-slate-200/90 dark:bg-slate-900/90 border border-slate-300 dark:border-white/10 shadow-inner transition-colors"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(value)}
            title={`${label} theme`}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? value === 'light'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : value === 'dark'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
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
