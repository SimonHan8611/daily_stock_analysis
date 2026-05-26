import type React from "react";
import { useId } from "react";
import { Checkbox as MantineCheckbox } from "@mantine/core";
import { cn } from "../../utils/cn";

interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
  containerClassName?: string;
}

/**
 * 定制化的大尺寸勾选框组件
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  id,
  className = "",
  containerClassName = "",
  ...props
}) => {
  const { size: nativeInputSize, ...checkboxProps } = props;
  void nativeInputSize;
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <MantineCheckbox
      id={checkboxId}
      label={label}
      className={containerClassName}
      classNames={{
        input: cn(
          "cursor-pointer border-border/70 bg-base text-cyan transition-all",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        ),
        label: "cursor-pointer select-none text-sm font-medium text-foreground",
      }}
      {...checkboxProps}
    />
  );
};
