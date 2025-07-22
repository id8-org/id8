import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { getChangeProposals, approveChangeProposal, rejectChangeProposal } from '@/lib/api';
import type { Idea, IdeaChangeProposal } from '@/lib/api';
import { Check, X } from 'lucide-react';

interface ChangeProposalListProps {
  idea: Idea;
}

export const ChangeProposalList: React.FC<ChangeProposalListProps> = ({ idea }) => {
  const [proposals, setProposals] = useState<IdeaChangeProposal[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProposals();
  }, [idea.id]);

  const fetchProposals = async () => {
    try {
      const data = await getChangeProposals(idea.id);
      setProposals(data.filter(p => p.status === 'pending'));
    } catch (error) {
      toast({ title: "Error fetching change proposals", variant: "destructive" });
    }
  };

  const handleApprove = async (proposalId: string) => {
    try {
      await approveChangeProposal(proposalId);
      fetchProposals();
      toast({ title: "Change approved" });
    } catch (error) {
      toast({ title: "Error approving change", variant: "destructive" });
    }
  };

  const handleReject = async (proposalId: string) => {
    try {
      await rejectChangeProposal(proposalId);
      fetchProposals();
      toast({ title: "Change rejected" });
    } catch (error) {
      toast({ title: "Error rejecting change", variant: "destructive" });
    }
  };
  
  if (proposals.length === 0) {
    return null; // Don't render if there are no pending proposals
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Changes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {proposals.map(p => (
          <div key={p.id} className="p-4 border rounded">
            <p className="text-sm text-gray-500">Proposed by: {p.proposer_id} on {new Date(p.created_at).toLocaleDateString()}</p>
            <div className="mt-2 space-y-2">
              {Object.entries(p.changes).map(([field, value]) => (
                <div key={field} className="grid grid-cols-3 gap-2 text-sm">
                  <span className="font-semibold">{field}</span>
                  <span className="text-gray-500 line-through">{(idea as any)[field]}</span>
                  <span className="text-green-600">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => handleApprove(p.id)}><Check className="h-4 w-4 mr-1" /> Approve</Button>
              <Button size="sm" variant="destructive" onClick={() => handleReject(p.id)}><X className="h-4 w-4 mr-1" /> Reject</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}; 