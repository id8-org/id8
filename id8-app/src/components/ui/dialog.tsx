import * as React from "react";

export const Dialog = ({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) => (
  open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[300px] max-w-lg relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>&times;</button>
        {children}
      </div>
    </div>
  ) : null
);
export const DialogContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const DialogHeader = ({ children }: { children: React.ReactNode }) => <div className="mb-2 font-semibold text-lg">{children}</div>;
export const DialogTitle = ({ children }: { children: React.ReactNode }) => <h2 className="text-xl font-bold mb-2">{children}</h2>; 