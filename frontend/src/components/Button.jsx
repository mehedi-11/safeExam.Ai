import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Button component with automatic loading spinner & disabled state.
 */
export default function Button({
  children,
  loading = false,
  loadingText,
  disabled = false,
  type = 'button',
  variant = 'primary', // 'primary' | 'tomato' | 'secondary' | 'danger' | 'outline' | 'dark'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon: Icon,
  className = '',
  onClick,
  ...props
}) {
  const isDisabled = Boolean(disabled || loading);

  const baseStyles = "inline-flex items-center justify-center font-bold rounded-xl smooth-transition transition-all duration-200 select-none";

  const sizeStyles = {
    sm: "py-1.5 px-3 text-xs gap-1.5",
    md: "py-2.5 px-5 text-sm gap-2",
    lg: "py-3 px-6 text-base gap-2.5"
  }[size] || "py-2.5 px-5 text-sm gap-2";

  const variantStyles = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200/50 hover:shadow-lg disabled:bg-indigo-400",
    tomato: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200/50 hover:shadow-lg disabled:bg-indigo-400",
    outline: "border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 disabled:border-indigo-100 disabled:text-indigo-300",
    dark: "bg-gray-900 hover:bg-black text-white shadow-md shadow-gray-200/50 disabled:bg-gray-500",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200/50 hover:shadow-lg disabled:bg-red-400",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:bg-gray-50 disabled:text-gray-400"
  }[variant] || variantStyles.primary;

  const disabledStyles = isDisabled
    ? "opacity-70 cursor-not-allowed pointer-events-none"
    : "cursor-pointer active:scale-[0.98]";

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 18;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${disabledStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin shrink-0" size={iconSize} />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="shrink-0" size={iconSize} />}
          {children}
        </>
      )}
    </button>
  );
}
