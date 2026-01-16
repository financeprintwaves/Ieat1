import React from 'react';
import { Menu, X } from 'lucide-react';

interface MobileResponsiveLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function MobileResponsiveLayout({
  children,
  header,
  isOpen = false,
  onToggle
}: MobileResponsiveLayoutProps) {
  return (
    <div className="w-full h-full flex flex-col">
      {/* Mobile Header */}
      <div className="md:hidden h-14 bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4 flex items-center justify-between">
        <h1 className="font-black text-lg text-slate-900 dark:text-white">iEat</h1>
        <button
          onClick={onToggle}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar for tablet/desktop */}
        <div className="hidden md:flex md:flex-col">
          {header}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>

        {/* Mobile Sidebar Drawer */}
        {isOpen && (
          <div className="md:hidden absolute inset-0 z-50 bg-black/50">
            <div className="w-80 h-full bg-white dark:bg-slate-900 overflow-auto">
              {header}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ResponsiveGrid({ columns = 2, children }: { columns?: number; children: React.ReactNode }) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2 grid-cols-1',
    3: 'md:grid-cols-2 lg:grid-cols-3 grid-cols-1',
    4: 'md:grid-cols-2 lg:grid-cols-4 grid-cols-1'
  }[columns] || 'grid-cols-1';

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {children}
    </div>
  );
}

export function TouchButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  [key: string]: any;
}) {
  const baseClass = 'font-bold uppercase tracking-widest rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClass = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-4 text-base'
  }[size];

  const variantClass = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${sizeClass} ${variantClass} min-h-[48px] md:min-h-auto`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TouchInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false
}: {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-4 py-3 md:py-2 text-base md:text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white min-h-[48px] md:min-h-auto"
    />
  );
}
