import * as React from "react";

export const Avatar = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`inline-block rounded-full overflow-hidden bg-gray-200 w-10 h-10 ${className}`} {...props}>{children}</div>
);
export const AvatarImage = ({ src, alt = "", className = "", ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <img src={src} alt={alt} className={`object-cover w-full h-full ${className}`} {...props} />
);
export const AvatarFallback = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center justify-center w-full h-full text-gray-500 ${className}`} {...props}>{children}</div>
); 