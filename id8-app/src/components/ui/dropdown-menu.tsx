import * as React from "react";

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => <div className="relative inline-block">{children}</div>;
export const DropdownMenuContent = ({ children }: { children: React.ReactNode }) => <div className="absolute z-10 mt-2 w-48 bg-white border rounded shadow-lg">{children}</div>;
export const DropdownMenuItem = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer" {...props}>{children}</div>;
export const DropdownMenuLabel = ({ children }: { children: React.ReactNode }) => <div className="px-4 py-2 font-semibold text-gray-700">{children}</div>;
export const DropdownMenuSeparator = () => <div className="border-t my-1" />;
export const DropdownMenuTrigger = ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>; 