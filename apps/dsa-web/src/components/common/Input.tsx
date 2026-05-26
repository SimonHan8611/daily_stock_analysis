import type React from "react";
import { useId, useState } from "react";
import { ActionIcon, Text, TextInput } from "@mantine/core";
import { Lock, Key } from "lucide-react";
import { cn } from "../../utils/cn";
import { EyeToggleIcon } from "./EyeToggleIcon";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  trailingAction?: React.ReactNode;
  /** Selects a scoped visual appearance for the input. */
  appearance?: "default" | "login";
  /** Enables the built-in password visibility toggle. */
  allowTogglePassword?: boolean;
  /** Controls the leading icon style. */
  iconType?: "password" | "key" | "none";
  /** Allows external visibility state control. */
  passwordVisible?: boolean;
  /** Notifies the parent when visibility changes in controlled mode. */
  onPasswordVisibleChange?: (visible: boolean) => void;
}

export const Input = ({
  label,
  hint,
  error,
  className = "",
  id,
  trailingAction,
  appearance = "default",
  allowTogglePassword,
  iconType = "none",
  passwordVisible,
  onPasswordVisibleChange,
  ...props
}: InputProps) => {
  const { style, type, size: nativeInputSize, ...inputProps } = props;
  void nativeInputSize;
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy =
    [props["aria-describedby"], errorId ?? hintId].filter(Boolean).join(" ") ||
    undefined;
  const ariaInvalid = props["aria-invalid"] ?? (error ? true : undefined);

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordInput = type === "password";
  const isVisibilityControlled = typeof passwordVisible === "boolean";
  const isLoginAppearance = appearance === "login";
  const visible = isVisibilityControlled ? passwordVisible : isPasswordVisible;
  const effectiveType =
    isPasswordInput && allowTogglePassword && visible ? "text" : type;

  const renderLeadingIcon = () => {
    if (iconType === "password") {
      return (
        <Lock
          className={cn(
            "h-4 w-4",
            isLoginAppearance
              ? "text-[var(--login-input-icon)]"
              : "text-muted-text/55",
          )}
        />
      );
    }
    if (iconType === "key") {
      return (
        <Key
          className={cn(
            "h-4 w-4",
            isLoginAppearance
              ? "text-[var(--login-input-icon)]"
              : "text-muted-text/55",
          )}
        />
      );
    }
    return null;
  };

  const leadingIcon = renderLeadingIcon();
  const inputStyle = error
    ? {
        ...style,
        ["--input-surface-border-focus" as string]:
          "hsla(var(--destructive), 0.4)",
        ["--input-surface-focus-ring" as string]:
          "0 0 0 4px hsla(var(--destructive), 0.1)",
      }
    : style;

  const defaultTrailingAction =
    isPasswordInput && allowTogglePassword ? (
      <ActionIcon
        type="button"
        variant="subtle"
        radius="lg"
        className={cn(
          "transition-all duration-200",
          isLoginAppearance
            ? visible
              ? "border-[var(--login-input-toggle-active-border)] bg-[var(--login-input-toggle-active-bg)] text-[var(--login-input-toggle-active-text)] shadow-[0_0_14px_var(--login-accent-glow)]"
              : "border-[var(--login-input-toggle-border)] bg-[var(--login-input-toggle-bg)] text-[var(--login-input-toggle-text)] hover:border-[var(--login-input-toggle-border-hover)] hover:bg-[var(--login-input-toggle-bg-hover)] hover:text-[var(--login-input-toggle-text-hover)]"
            : visible
              ? "border-warning/40 bg-warning/15 text-warning shadow-[0_0_10px_hsla(var(--warning),0.15)]"
              : "border-border/40 bg-muted/20 text-muted-text hover:border-warning/40 hover:text-warning hover:shadow-[0_0_10px_hsla(var(--warning),0.15)]",
        )}
        onClick={() => {
          const nextVisible = !visible;
          if (!isVisibilityControlled) {
            setIsPasswordVisible(nextVisible);
          }
          onPasswordVisibleChange?.(nextVisible);
        }}
        aria-label={visible ? "隐藏内容" : "显示内容"}
        tabIndex={-1}
      >
        <EyeToggleIcon visible={visible} />
      </ActionIcon>
    ) : null;

  const finalTrailingAction = trailingAction || defaultTrailingAction;

  return (
    <div className="flex flex-col">
      {label ? (
        <label
          htmlFor={inputId}
          className={cn(
            "mb-2 text-sm font-medium",
            isLoginAppearance
              ? "text-[var(--login-label-text)]"
              : "text-foreground",
          )}
        >
          {label}
        </label>
      ) : null}
      <TextInput
        id={inputId}
        type={effectiveType}
        aria-describedby={describedBy}
        aria-invalid={ariaInvalid}
        data-appearance={appearance}
        leftSection={leadingIcon}
        rightSection={finalTrailingAction}
        rightSectionPointerEvents="all"
        classNames={{
          input: cn(
            "input-surface input-focus-glow h-11 w-full rounded-xl border bg-transparent px-4 text-sm transition-all",
            "focus:outline-none",
            isLoginAppearance ? "input-appearance-login" : "",
            error ? "border-danger/30" : "",
            leadingIcon ? "pl-10" : "",
            finalTrailingAction ? "pr-12" : "",
            "disabled:cursor-not-allowed disabled:opacity-60",
            className,
          ),
        }}
        styles={{
          input: inputStyle,
          section: {
            width: finalTrailingAction ? 44 : undefined,
          },
        }}
        {...inputProps}
      />
      {error ? (
        <Text
          id={errorId}
          role="alert"
          size="xs"
          mt={8}
          className={cn(
            isLoginAppearance
              ? "text-[var(--login-error-text)]"
              : "text-danger",
          )}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          id={hintId}
          size="xs"
          mt={8}
          className={cn(
            isLoginAppearance
              ? "text-[var(--login-hint-text)]"
              : "text-secondary-text",
          )}
        >
          {hint}
        </Text>
      ) : null}
    </div>
  );
};
