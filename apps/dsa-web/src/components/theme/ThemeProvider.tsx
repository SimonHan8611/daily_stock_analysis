import type React from 'react';
import { useEffect } from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useTheme } from 'next-themes';
import { mantineTheme } from '../../theme/mantineTheme';

type ThemeProviderProps = {
  children: React.ReactNode;
};

const MantineThemeBridge: React.FC<ThemeProviderProps> = ({ children }) => {
  const { resolvedTheme } = useTheme();
  const colorScheme = resolvedTheme === 'light' ? 'light' : 'dark';

  useEffect(() => {
    document.documentElement.style.colorScheme = colorScheme;
    document.documentElement.setAttribute('data-mantine-color-scheme', colorScheme);
  }, [colorScheme]);

  return (
    <MantineProvider
      theme={mantineTheme}
      defaultColorScheme="dark"
      forceColorScheme={colorScheme}
    >
      <Notifications position="top-right" zIndex={2200} />
      {children}
    </MantineProvider>
  );
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <NextThemesProvider
      attribute="class"
      storageKey="theme"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <MantineThemeBridge>{children}</MantineThemeBridge>
    </NextThemesProvider>
  );
};
