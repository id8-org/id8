import * as React from "react";

export const Sheet = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const SheetContent = ({ children }: { children: React.ReactNode }) => (
  <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-50 p-6">{children}</div>
); 