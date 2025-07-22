import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/components/ui/use-toast";
import { getCollaborators, addCollaborator, removeCollaborator } from '@/lib/api';
import type { Idea, IdeaCollaborator } from '@/lib/api';

interface CollaboratorManagerProps {
  idea: Idea;
}

export const CollaboratorManager: React.FC<CollaboratorManagerProps> = ({ idea }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<IdeaCollaborator[]>([]);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [newCollaboratorRole, setNewCollaboratorRole] = useState<'editor' | 'viewer'>('viewer');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchCollaborators();
    }
  }, [isOpen, idea.id]);

  const fetchCollaborators = async () => {
    try {
      const data = await getCollaborators(idea.id);
      setCollaborators(data);
    } catch (error) {
      toast({ title: "Error fetching collaborators", variant: "destructive" });
    }
  };

  const handleAddCollaborator = async () => {
    // This is a simplification. In a real app, you'd get the user ID from the email.
    // For now, we'll assume the input is a user ID.
    try {
      await addCollaborator(idea.id, newCollaboratorEmail, newCollaboratorRole);
      setNewCollaboratorEmail('');
      fetchCollaborators();
      toast({ title: "Collaborator added" });
    } catch (error) {
      toast({ title: "Error adding collaborator", variant: "destructive" });
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    try {
      await removeCollaborator(idea.id, userId);
      fetchCollaborators();
      toast({ title: "Collaborator removed" });
    } catch (error) {
      toast({ title: "Error removing collaborator", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>{'Manage Collaborators'}</Button>
      </DialogTrigger>
      <DialogContent aria-describedby="collab-dialog-desc">
        <div id="collab-dialog-desc" style={{display: 'none'}}>Manage collaborators for this idea.</div>
        <DialogHeader>
          <DialogTitle>Manage Collaborators for {idea.title}</DialogTitle>
          <DialogDescription id="collab-desc">
            Add, remove, or change roles for collaborators on this idea.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">Add New Collaborator</h4>
            <div className="flex space-x-2 mt-2">
              <Input
                placeholder="User ID or Email"
                value={newCollaboratorEmail}
                onChange={(e) => setNewCollaboratorEmail(e.target.value)}
              />
              <Select onValueChange={(value: 'editor' | 'viewer') => setNewCollaboratorRole(value)} defaultValue={newCollaboratorRole}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddCollaborator}>Add</Button>
            </div>
          </div>

          <div>
            <h4 className="font-medium">Current Collaborators</h4>
            <ul className="space-y-2 mt-2">
              {collaborators.map(c => (
                <li key={c.id} className="flex items-center justify-between p-2 border rounded">
                  <span>{c.user_id} ({c.role})</span>
                  <Button onClick={() => handleRemoveCollaborator(c.user_id)}>{'Remove'}</Button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 