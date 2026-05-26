import { render, screen, waitFor } from "@testing-library/react";
import { useMantineTheme } from "@mantine/core";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../src/components/theme/ThemeProvider";

const ThemeProbe = () => {
  const theme = useMantineTheme();

  return (
    <div
      data-testid="mantine-theme-probe"
      data-default-radius={theme.defaultRadius}
      data-primary-color={theme.primaryColor}
    />
  );
};

describe("Mantine theme provider bridge", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.removeAttribute("data-mantine-color-scheme");
    document.documentElement.style.colorScheme = "";
  });

  it("initializes Mantine with the persisted light theme", async () => {
    window.localStorage.setItem("theme", "light");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(
        document.documentElement.getAttribute("data-mantine-color-scheme"),
      ).toBe("light");
    });

    const probe = screen.getByTestId("mantine-theme-probe");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(probe.getAttribute("data-primary-color")).toBe("brand");
    expect(probe.getAttribute("data-default-radius")).toBe("lg");
  });
});
