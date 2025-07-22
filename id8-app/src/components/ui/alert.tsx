import * as React from "react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative ${className}`} {...props} />
  )
);
Alert.displayName = "Alert"; 