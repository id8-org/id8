import React, { useState } from "react";

const actions = [
  { icon: "✏️", label: "Edit", key: "edit" },
  { icon: "📄", label: "Export", key: "export" },
  { icon: "📤", label: "Share", key: "share" },
  { icon: "🖨️", label: "Print", key: "print" },
  { icon: "🔁", label: "Clone", key: "clone" },
  { icon: "🗑️", label: "Archive", key: "archive" },
  { icon: "👥", label: "Permissions", key: "permissions" },
  { icon: "⚙️", label: "Settings", key: "settings" },
];

export const GlobalActionsDropdown = ({ onAction }: { onAction?: (key: string) => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="p-2 rounded-full hover:bg-slate-100 text-xl"
        onClick={() => setOpen((v) => !v)}
        aria-label="Global Actions"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-50">
          {actions.map((action) => (
            <button
              key={action.key}
              className="flex items-center w-full px-4 py-2 text-left hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                onAction?.(action.key);
              }}
            >
              <span className="mr-2">{action.icon}</span> {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};