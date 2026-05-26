import type React from "react";
import {
  Box,
  Drawer as MantineDrawer,
  Group,
  Text,
  Title,
} from "@mantine/core";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
  zIndex?: number;
  side?: "left" | "right";
  backdropClassName?: string;
}

const DRAWER_SIZE_MAP: Record<string, string> = {
  "max-w-xs": "20rem",
  "max-w-sm": "24rem",
  "max-w-md": "28rem",
  "max-w-lg": "32rem",
  "max-w-xl": "36rem",
  "max-w-2xl": "42rem",
  "max-w-3xl": "48rem",
};

/**
 * Side drawer component with terminal-inspired styling.
 */
export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = "max-w-2xl",
  zIndex = 50,
  side = "right",
  backdropClassName,
}) => {
  const resolvedSize = DRAWER_SIZE_MAP[width] ?? width;

  return (
    <MantineDrawer
      opened={isOpen}
      onClose={onClose}
      position={side}
      size={resolvedSize}
      zIndex={zIndex}
      padding="xl"
      overlayProps={{
        opacity: 0.8,
        blur: 3,
        className: backdropClassName,
      }}
      title={
        title ? (
          <Box>
            <Text className="label-uppercase">DETAIL VIEW</Text>
            <Title
              order={2}
              className="mt-1 text-lg font-semibold text-foreground"
            >
              {title}
            </Title>
          </Box>
        ) : undefined
      }
      styles={{
        header: {
          borderBottom: "1px solid var(--mantine-color-default-border)",
        },
        body: {
          height: "100%",
        },
        content: {
          background: "var(--mantine-color-body)",
        },
      }}
      closeButtonProps={{
        "aria-label": "关闭抽屉",
      }}
    >
      <Group align="stretch" style={{ minHeight: "100%" }}>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </Group>
    </MantineDrawer>
  );
};
