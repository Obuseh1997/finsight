'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  { number: 1, label: 'Upload' },
  { number: 2, label: 'Review' },
  { number: 3, label: 'Insights' },
] as const;

export function AppHeader({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <header
      className="bg-[hsl(var(--nav))] border-b border-[hsl(var(--nav-border))] sticky top-0 z-40"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 bg-[hsl(var(--primary))] rounded-md flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <span className="font-display text-base font-bold text-[hsl(var(--foreground))] tracking-tight">
            FinSight
          </span>
        </div>

        {/* Step indicator */}
        <nav className="flex items-center gap-1" aria-label="Progress">
          {STEPS.map((step, i) => {
            const isComplete = step.number < currentStep;
            const isActive = step.number === currentStep;

            return (
              <div key={step.number} className="flex items-center">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                      : isComplete
                      ? 'text-[hsl(var(--success))]'
                      : 'text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  {isComplete ? (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                        isActive
                          ? 'bg-[hsl(var(--primary))] text-white'
                          : 'bg-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                      }`}
                    >
                      {step.number}
                    </span>
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <svg
                    className="w-3.5 h-3.5 mx-0.5 text-[hsl(var(--border))]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            );
          })}
        </nav>

        {/* Theme toggle */}
        <div className="shrink-0 w-7">
          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))] transition-colors"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <svg
                  className="w-4 h-4 text-[hsl(var(--muted-foreground))]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-[hsl(var(--muted-foreground))]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
