import * as React from "react";

export const Accordion = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`border rounded ${className}`} {...props}>{children}</div>
);
export const AccordionItem = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`border-b last:border-b-0 ${className}`} {...props}>{children}</div>
);
export const AccordionTrigger = ({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={`w-full text-left py-2 px-4 font-semibold ${className}`} {...props}>{children}</button>
);
export const AccordionContent = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`px-4 py-2 ${className}`} {...props}>{children}</div>
); 