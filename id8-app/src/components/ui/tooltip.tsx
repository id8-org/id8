import * as React from "react";

export const Tooltip = ({ children }: { children: React.ReactNode }) => <span>{children}</span>;
export const TooltipTrigger = ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <span {...props}>{children}</span>;
export const TooltipContent = ({ children }: { children: React.ReactNode }) => (
  <span className="absolute z-50 bg-black text-white text-xs rounded px-2 py-1 mt-1">{children}</span>
); 