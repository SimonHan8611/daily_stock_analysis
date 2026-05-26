import { createTheme, rem } from "@mantine/core";

const brandScale = [
  "#e2fbff",
  "#b5f2ff",
  "#84e8ff",
  "#4adcfb",
  "#1ad1f6",
  "#00c3ea",
  "#00add1",
  "#0096b7",
  "#007f9d",
  "#006985",
] as const;

const accentScale = [
  "#f1ebff",
  "#ddd0ff",
  "#c7b2ff",
  "#b091ff",
  "#9c76ff",
  "#8d63ff",
  "#7f58ff",
  "#6d47e5",
  "#5f3fcb",
  "#5134b1",
] as const;

const neutralDarkScale = [
  "#eef2ff",
  "#d7def5",
  "#b6c0de",
  "#94a1c4",
  "#7684ac",
  "#647299",
  "#56648a",
  "#475473",
  "#3c4867",
  "#313c59",
] as const;

export const mantineTheme = createTheme({
  primaryColor: "brand",
  colors: {
    brand: brandScale,
    accent: accentScale,
    slate: neutralDarkScale,
  },
  fontFamily:
    'Inter, "SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif',
  fontFamilyMonospace:
    '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  defaultRadius: "lg",
  cursorType: "pointer",
  focusRing: "auto",
  defaultGradient: {
    from: "brand.5",
    to: "brand.7",
    deg: 135,
  },
  radius: {
    xs: rem(8),
    sm: rem(12),
    md: rem(16),
    lg: rem(20),
    xl: rem(24),
  },
  spacing: {
    xs: rem(8),
    sm: rem(12),
    md: rem(16),
    lg: rem(20),
    xl: rem(24),
  },
  shadows: {
    xs: "0 8px 18px rgba(15, 23, 42, 0.08)",
    sm: "0 12px 24px rgba(15, 23, 42, 0.1)",
    md: "0 16px 32px rgba(15, 23, 42, 0.14)",
    lg: "0 22px 44px rgba(15, 23, 42, 0.18)",
    xl: "0 28px 56px rgba(15, 23, 42, 0.24)",
  },
  headings: {
    fontFamily:
      'Inter, "SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif',
    sizes: {
      h1: { fontSize: rem(32), lineHeight: "1.15", fontWeight: "700" },
      h2: { fontSize: rem(28), lineHeight: "1.2", fontWeight: "700" },
      h3: { fontSize: rem(22), lineHeight: "1.25", fontWeight: "650" },
      h4: { fontSize: rem(18), lineHeight: "1.3", fontWeight: "650" },
      h5: { fontSize: rem(16), lineHeight: "1.35", fontWeight: "600" },
      h6: { fontSize: rem(14), lineHeight: "1.4", fontWeight: "600" },
    },
  },
  other: {
    shellMaxWidth: rem(1680),
  },
  components: {
    AppShell: {
      defaultProps: {
        padding: "md",
      },
    },
    Button: {
      defaultProps: {
        radius: "xl",
        fw: 600,
      },
    },
    Card: {
      defaultProps: {
        radius: "xl",
        shadow: "sm",
        withBorder: true,
      },
    },
    Paper: {
      defaultProps: {
        radius: "xl",
        shadow: "sm",
      },
    },
    TextInput: {
      defaultProps: {
        radius: "lg",
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: "lg",
      },
    },
    Select: {
      defaultProps: {
        radius: "lg",
      },
    },
    Checkbox: {
      defaultProps: {
        radius: "sm",
      },
    },
    Drawer: {
      defaultProps: {
        radius: "xl",
        offset: 8,
      },
    },
    Modal: {
      defaultProps: {
        radius: "xl",
        centered: true,
      },
    },
    Notification: {
      defaultProps: {
        radius: "xl",
        withBorder: true,
      },
    },
  },
});
