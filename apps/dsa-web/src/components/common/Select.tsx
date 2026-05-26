import React, { useId } from "react";
import { Select as MantineSelect } from "@mantine/core";
import { cn } from "../../utils/cn";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
}

/**
 * Select component with terminal-inspired styling.
 */
export const Select: React.FC<SelectProps> = ({
  id,
  value,
  onChange,
  options,
  label,
  placeholder = "请选择",
  disabled = false,
  className = "",
  searchable = false,
  emptyText = "暂无数据",
}) => {
  const selectId = useId();
  const resolvedId = id ?? selectId;

  return (
    <MantineSelect
      id={resolvedId}
      label={label}
      value={value || null}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      data={options}
      disabled={disabled}
      placeholder={placeholder}
      searchable={searchable}
      nothingFoundMessage={emptyText}
      className={className}
      classNames={{
        input: cn(
          "input-surface input-focus-glow h-11 rounded-xl border bg-transparent text-sm text-foreground transition-all duration-200 focus:outline-none",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        ),
        label: "mb-2 text-sm font-medium text-foreground",
      }}
    />
  );
};
