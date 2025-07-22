import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface EditIdeaModalProps {
  open: boolean;
  onClose: () => void;
  project: any; // This will need to be updated if a modal is used here
  onSave: () => void;
  isSaving: boolean;
  errors: { [key: string]: string };
  editTitle: string;
  setEditTitle: (title: string) => void;
  editHook: string;
  setEditHook: (hook: string) => void;
  editValue: string;
  setEditValue: (value: string) => void;
  editEffort: string;
  setEditEffort: (effort: string) => void;
  editTAM: string;
  setEditTAM: (tam: string) => void;
}

export const EditIdeaModal: React.FC<EditIdeaModalProps> = ({
  open,
  onClose,
  project,
  onSave,
  isSaving,
  errors,
  editTitle,
  setEditTitle,
  editHook,
  setEditHook,
  editValue,
  setEditValue,
  editEffort,
  setEditEffort,
  editTAM,
  setEditTAM,
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            {errors.title && <div className="text-xs text-red-500 mt-1">{errors.title}</div>}
          </div>
          <div>
            <Label htmlFor="edit-hook">Hook</Label>
            <Input id="edit-hook" value={editHook} onChange={e => setEditHook(e.target.value)} />
            {errors.hook && <div className="text-xs text-red-500 mt-1">{errors.hook}</div>}
          </div>
          <div>
            <Label htmlFor="edit-value">Value Proposition</Label>
            <Input id="edit-value" value={editValue} onChange={e => setEditValue(e.target.value)} />
            {errors.value && <div className="text-xs text-red-500 mt-1">{errors.value}</div>}
          </div>
          <div>
            <Label htmlFor="edit-effort">Effort <span className="text-xs text-gray-400">(1–10)</span></Label>
            <div className="relative">
              <Input
                id="edit-effort"
                type="number"
                min={1}
                max={10}
                step={1}
                value={editEffort}
                onChange={e => setEditEffort(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Enter a number between 1 and 10"
                className={errors.effort ? 'border-red-400' : ''}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">score</span>
            </div>
            {errors.effort && <div className="text-xs text-red-500 mt-1 animate-pulse">{errors.effort}</div>}
          </div>
          <div>
            <Label htmlFor="edit-tam">TAM <span className="text-xs text-gray-400">($1M–$1B)</span></Label>
            <div className="relative">
              <Input
                id="edit-tam"
                type="number"
                min={1000000}
                max={1000000000}
                step={1000000}
                value={editTAM}
                onChange={e => setEditTAM(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g., 500000000 for $500M"
                className={errors.tam ? 'border-red-400' : ''}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">USD</span>
            </div>
            {errors.tam && <div className="text-xs text-red-500 mt-1 animate-pulse">{errors.tam}</div>}
            {editTAM && !errors.tam && (
              <div className="text-xs text-gray-500 mt-1">{Number(editTAM).toLocaleString()} USD</div>
            )}
          </div>
          {errors.general && (
            <div className="text-xs text-red-500 mt-1">{errors.general}</div>
          )}
        </div>
        <DialogFooter className="mt-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 