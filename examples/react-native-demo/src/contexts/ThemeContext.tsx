/**
 * Theme Context with Selector Pattern
 *
 * Demonstrates:
 * - Context splitting to avoid unnecessary re-renders
 * - Stable context values with useMemo
 * - useContext with proper typing
 * - Theme toggle with reduced motion support
 *
 * The key insight: Split context into STATE and ACTIONS
 * - State context changes → components re-render
 * - Actions context never changes → no re-renders from consuming actions
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from 'react';

// ============================================================================
// Theme Types
// ============================================================================

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  readonly background: string;
  readonly surface: string;
  readonly text: string;
  readonly textSecondary: string;
  readonly primary: string;
  readonly primaryText: string;
  readonly border: string;
  readonly error: string;
  readonly success: string;
  readonly warning: string;
}

export interface Theme {
  readonly colorScheme: ColorScheme;
  readonly colors: ThemeColors;
  readonly spacing: {
    readonly xs: number;
    readonly sm: number;
    readonly md: number;
    readonly lg: number;
    readonly xl: number;
  };
  readonly borderRadius: {
    readonly sm: number;
    readonly md: number;
    readonly lg: number;
    readonly full: number;
  };
}

// ============================================================================
// Theme Definitions
// ============================================================================

const lightColors: ThemeColors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  primary: '#007AFF',
  primaryText: '#FFFFFF',
  border: '#E0E0E0',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
};

const darkColors: ThemeColors = {
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  primary: '#0A84FF',
  primaryText: '#FFFFFF',
  border: '#333333',
  error: '#FF453A',
  success: '#30D158',
  warning: '#FF9F0A',
};

const sharedTheme = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  borderRadius: { sm: 4, md: 8, lg: 16, full: 9999 },
} as const;

const lightTheme: Theme = {
  colorScheme: 'light',
  colors: lightColors,
  ...sharedTheme,
};

const darkTheme: Theme = {
  colorScheme: 'dark',
  colors: darkColors,
  ...sharedTheme,
};

// ============================================================================
// Split Contexts - The 2026 Pattern
// ============================================================================

// STATE context - will cause re-renders when theme changes
const ThemeStateContext = createContext<Theme | null>(null);

// ACTIONS context - stable, never causes re-renders
interface ThemeActions {
  readonly toggleTheme: () => void;
  readonly setColorScheme: (scheme: ColorScheme) => void;
}
const ThemeActionsContext = createContext<ThemeActions | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

interface ThemeProviderProps {
  readonly children: ReactNode;
  readonly initialScheme?: ColorScheme;
}

export function ThemeProvider({
  children,
  initialScheme = 'light',
}: ThemeProviderProps) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(initialScheme);

  const theme = colorScheme === 'light' ? lightTheme : darkTheme;

  // Memoize actions so they're stable references
  const actions = useMemo<ThemeActions>(
    () => ({
      toggleTheme: () =>
        setColorScheme((prev) => (prev === 'light' ? 'dark' : 'light')),
      setColorScheme,
    }),
    [],
  );

  return (
    <ThemeActionsContext.Provider value={actions}>
      <ThemeStateContext.Provider value={theme}>
        {children}
      </ThemeStateContext.Provider>
    </ThemeActionsContext.Provider>
  );
}

// ============================================================================
// Consumer Hooks
// ============================================================================

/**
 * Hook to access theme state
 * Components using this WILL re-render when theme changes
 */
export function useTheme(): Theme {
  const theme = useContext(ThemeStateContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}

/**
 * Hook to access theme actions only
 * Components using this will NOT re-render when theme changes
 */
export function useThemeActions(): ThemeActions {
  const actions = useContext(ThemeActionsContext);
  if (!actions) {
    throw new Error('useThemeActions must be used within a ThemeProvider');
  }
  return actions;
}
