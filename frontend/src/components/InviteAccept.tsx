import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { acceptInvite, revokeInvite, Invite } from '@/lib/api';

interface Invite {
  id: string;
  email: string;
  inviter: { name: string; email: string };
  team: { name: string };
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

interface InviteAcceptProps {
  invite: Invite;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

export const InviteAccept: React.FC<InviteAcceptProps> = ({ invite, onAccept, onDecline }) => {
  const { toast } = useToast();
  const isPending = invite.status === 'pending';

  const handleAccept = () => {
    onAccept(invite.id);
    toast({ title: 'Invite accepted', description: 'You have joined the team!' });
    // TODO: Call backend to accept invite
  };

  const handleDecline = () => {
    onDecline(invite.id);
    toast({ title: 'Invite declined', description: 'You have declined the invite.' });
    // TODO: Call backend to decline invite
  };

  const getStatusBadge = (status: Invite['status']) => {
    switch (status) {
      case 'pending': return <Badge className="bg-blue-100 text-blue-800"><AlertCircle className="w-4 h-4 mr-1 inline" />Pending</Badge>;
      case 'accepted': return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-4 h-4 mr-1 inline" />Accepted</Badge>;
      case 'expired': return <Badge className="bg-gray-100 text-gray-600"><XCircle className="w-4 h-4 mr-1 inline" />Expired</Badge>;
      case 'revoked': return <Badge className="bg-red-100 text-red-800"><XCircle className="w-4 h-4 mr-1 inline" />Revoked</Badge>;
      default: return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-600" />
            Team Invitation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-2">
            <User className="w-8 h-8 text-gray-500" />
            <div className="text-lg font-semibold">{invite.team.name}</div>
            <div className="text-sm text-gray-600">Invited by {invite.inviter.name} ({invite.inviter.email})</div>
            <div className="text-sm text-gray-600">Your email: <span className="font-mono">{invite.email}</span></div>
            <div className="mt-2">{getStatusBadge(invite.status)}</div>
          </div>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleAccept} disabled={!isPending} variant={'default' as const} size={'sm' as const}>Accept</Button>
            <Button onClick={handleDecline} disabled={!isPending} variant={'ghost' as const} size={'sm' as const}>Decline</Button>
          </div>
          {!isPending && (
            <div className="text-xs text-gray-500 text-center mt-2">This invite is no longer active.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 