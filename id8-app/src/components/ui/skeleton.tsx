import * as React from "react";

export const Skeleton = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} {...props} />
); 