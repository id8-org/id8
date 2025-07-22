import * as React from "react";

export const Tabs = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col ${className}`} {...props}>{children}</div>
);
export const TabsList = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex border-b ${className}`} {...props}>{children}</div>
);
export const TabsTrigger = ({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={`px-4 py-2 font-medium focus:outline-none ${className}`} {...props}>{children}</button>
);
export const TabsContent = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-4 ${className}`} {...props}>{children}</div>
); 