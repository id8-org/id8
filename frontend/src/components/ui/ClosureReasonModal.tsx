import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './dialog';
import { Button } from './button';

export default function ClosureReasonModal({ open, onClose, onSubmit, ideaTitle }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { closureReason: string; postMortem: string }) => void;
  ideaTitle?: string;
}) {
  const [closureReason, setClosureReason] = useState('');
  const [postMortem, setPostMortem] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit({ closureReason, postMortem });
    setSubmitting(false);
    setClosureReason('');
    setPostMortem('');
  };

  const handleClose = () => {
    setClosureReason('');
    setPostMortem('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Idea</DialogTitle>
          <DialogDescription>
            Optionally provide a reason for closing <span className="font-semibold">{ideaTitle || 'this idea'}</span> and a post-mortem for future reference.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium mb-1">Closure Reason (optional)</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              rows={2}
              value={closureReason}
              onChange={e => setClosureReason(e.target.value)}
              placeholder="Why is this idea being closed?"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Post-Mortem (optional)</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              rows={3}
              value={postMortem}
              onChange={e => setPostMortem(e.target.value)}
              placeholder="What did you learn? What would you do differently?"
              disabled={submitting}
            />
          </div>
        </div>
        <DialogFooter className="mt-4 flex gap-2 justify-end">
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>Skip</Button>
          <Button onClick={handleSubmit} disabled={submitting}>Save & Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 