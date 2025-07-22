import * as React from "react";

export const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className="border rounded px-3 py-2" {...props}>{children}</select>
);
export const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const SelectItem = ({ children, value }: { children: React.ReactNode; value: string }) => <option value={value}>{children}</option>;
export const SelectTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const SelectValue = ({ children }: { children: React.ReactNode }) => <>{children}</>; 