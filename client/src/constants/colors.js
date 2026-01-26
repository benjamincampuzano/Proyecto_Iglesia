// Design System - Color Palette
// Sistema de colores institucional para consistencia visual

export const colors = {
  // Primary Colors - Azul institucional
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554'
  },

  // Secondary Colors - Grises
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712'
  },

  // Success Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16'
  },

  // Warning Colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03'
  },

  // Error Colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a'
  },

  // Info Colors
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49'
  }
};

// Semantic color mappings
export const semanticColors = {
  // Background colors
  background: {
    primary: colors.white,
    secondary: colors.gray[50],
    tertiary: colors.gray[100]
  },

  // Text colors
  text: {
    primary: colors.gray[900],
    secondary: colors.gray[600],
    tertiary: colors.gray[500],
    inverse: colors.white,
    success: colors.success[600],
    warning: colors.warning[600],
    error: colors.error[600],
    info: colors.info[600]
  },

  // Border colors
  border: {
    primary: colors.gray[200],
    secondary: colors.gray[300],
    focus: colors.primary[500],
    error: colors.error[500],
    success: colors.success[500],
    warning: colors.warning[500]
  },

  // Button colors
  button: {
    primary: {
      bg: colors.primary[600],
      hover: colors.primary[700],
      text: colors.white,
      disabled: colors.gray[400]
    },
    secondary: {
      bg: colors.gray[200],
      hover: colors.gray[300],
      text: colors.gray[700],
      disabled: colors.gray[100]
    },
    success: {
      bg: colors.success[600],
      hover: colors.success[700],
      text: colors.white,
      disabled: colors.gray[400]
    },
    warning: {
      bg: colors.warning[600],
      hover: colors.warning[700],
      text: colors.white,
      disabled: colors.gray[400]
    },
    error: {
      bg: colors.error[600],
      hover: colors.error[700],
      text: colors.white,
      disabled: colors.gray[400]
    }
  }
};

// Dark mode colors
export const darkColors = {
  background: {
    primary: colors.gray[900],
    secondary: colors.gray[800],
    tertiary: colors.gray[700]
  },
  text: {
    primary: colors.white,
    secondary: colors.gray[300],
    tertiary: colors.gray[400],
    inverse: colors.gray[900]
  },
  border: {
    primary: colors.gray[700],
    secondary: colors.gray[600],
    focus: colors.primary[400]
  }
};

// Export utility functions
export const getColorClass = (colorPath, isDark = false) => {
  const colorMap = isDark ? darkColors : semanticColors;
  const keys = colorPath.split('.');
  let color = colorMap;
  
  for (const key of keys) {
    color = color[key];
    if (!color) return '';
  }
  
  return color;
};

// Tailwind color utilities
export const tailwindColors = {
  primary: colors.primary,
  gray: colors.gray,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info
};
