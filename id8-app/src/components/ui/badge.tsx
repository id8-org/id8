import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error";
}

const variantStyles: Record<string, string> = {
  default: "bg-gray-200 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${variantStyles[variant] || variantStyles.default} ${className}`}
      {...props}
    />
  )
);
Badge.displayName = "Badge"; 