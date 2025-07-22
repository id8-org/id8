import * as React from "react";

export const Separator = ({ className = "", ...props }: React.HTMLAttributes<HTMLHRElement>) => (
  <hr className={`border-t border-gray-200 my-4 ${className}`} {...props} />
); 