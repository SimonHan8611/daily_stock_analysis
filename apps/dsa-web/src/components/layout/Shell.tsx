import type React from "react";
import { useEffect, useState } from "react";
import { ActionIcon, AppShell, Box, Drawer } from "@mantine/core";
import { Menu } from "lucide-react";
import { Outlet } from "react-router-dom";
import { SidebarNav } from "./SidebarNav";

type ShellProps = {
  children?: React.ReactNode;
};

export const Shell: React.FC<ShellProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileOpen]);

  return (
    <AppShell
      padding={0}
      navbar={{
        width: 224,
        breakpoint: "lg",
        collapsed: { mobile: true },
      }}
      styles={{
        root: {
          background: "hsl(214 18% 96%)",
        },
        navbar: {
          background: "hsl(0 0% 100% / 0.98)",
          borderRight: "1px solid hsl(220 16% 90%)",
        },
        main: {
          background: "hsl(214 18% 96%)",
        },
      }}
    >
      <AppShell.Navbar p={0} visibleFrom="lg">
        <SidebarNav onNavigate={() => setMobileOpen(false)} />
      </AppShell.Navbar>

      <AppShell.Main>
        <Box className="shell-main-body touch-pan-y">
          <ActionIcon
            type="button"
            variant="light"
            size="lg"
            hiddenFrom="lg"
            onClick={() => setMobileOpen(true)}
            aria-label="打开导航菜单"
            className="fixed left-3 top-3 z-[120]"
          >
            <Menu size={18} />
          </ActionIcon>
          {children ?? <Outlet />}
        </Box>
      </AppShell.Main>

      <Drawer
        opened={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="导航菜单"
        position="left"
        size={256}
        overlayProps={{ opacity: 0.45, blur: 3 }}
      >
        <SidebarNav onNavigate={() => setMobileOpen(false)} />
      </Drawer>
    </AppShell>
  );
};
