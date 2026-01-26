import React from 'react';
import { colors, semanticColors } from '../../constants/colors';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };

  const variantClasses = {
    primary: `bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 ${disabled ? 'bg-gray-400 hover:bg-gray-400' : ''}`,
    secondary: `bg-gray-200 hover:bg-gray-300 text-gray-700 focus:ring-gray-500 ${disabled ? 'bg-gray-100 hover:bg-gray-100 text-gray-400' : ''}`,
    success: `bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 ${disabled ? 'bg-gray-400 hover:bg-gray-400' : ''}`,
    warning: `bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500 ${disabled ? 'bg-gray-400 hover:bg-gray-400' : ''}`,
    error: `bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 ${disabled ? 'bg-gray-400 hover:bg-gray-400' : ''}`,
    outline: `border-2 border-gray-300 hover:border-gray-400 text-gray-700 focus:ring-gray-500 ${disabled ? 'border-gray-200 text-gray-400' : ''}`,
    ghost: `text-gray-700 hover:bg-gray-100 focus:ring-gray-500 ${disabled ? 'text-gray-400 hover:bg-transparent' : ''}`
  };

  const darkModeClasses = {
    primary: 'dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white dark:focus:ring-blue-500',
    secondary: 'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 dark:focus:ring-gray-500',
    success: 'dark:bg-green-600 dark:hover:bg-green-700 dark:text-white dark:focus:ring-green-500',
    warning: 'dark:bg-yellow-600 dark:hover:bg-yellow-700 dark:text-white dark:focus:ring-yellow-500',
    error: 'dark:bg-red-600 dark:hover:bg-red-700 dark:text-white dark:focus:ring-red-500',
    outline: 'dark:border-gray-600 dark:hover:border-gray-500 dark:text-gray-200 dark:focus:ring-gray-500',
    ghost: 'dark:text-gray-200 dark:hover:bg-gray-800 dark:focus:ring-gray-500'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7'
  };

  const loadingSpinner = (
    <svg 
      className={`animate-spin ${iconSizeClasses[size]}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const renderIcon = () => {
    if (loading) return loadingSpinner;
    if (Icon) return <Icon className={iconSizeClasses[size]} />;
    return null;
  };

  const iconElement = renderIcon();
  const iconSpacing = iconElement ? (iconPosition === 'left' ? 'mr-2' : 'ml-2') : '';

  return (
    <button
      type={type}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${darkModeClasses[variant]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {iconPosition === 'left' && iconElement}
      {children}
      {iconPosition === 'right' && iconElement}
    </button>
  );
};

export default Button;
