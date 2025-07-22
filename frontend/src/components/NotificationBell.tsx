import React, { useState } from 'react';
import { Bell, CheckCircle, AlertCircle, UserPlus, XCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  getNotifications,
  markNotificationRead,
  clearAllNotifications,
  Notification,
} from '@/lib/api';

interface Notification {
  id: string;
  type: 'invite' | 'mention' | 'comment' | 'team' | 'system';
  message: string;
  timestamp: string;
  read: boolean;
}

interface NotificationBellProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ notifications, onMarkRead, onClearAll }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string) => {
    onMarkRead(id);
    toast({ title: 'Notification marked as read' });
    // TODO: Call backend to mark as read
  };

  const handleClearAll = () => {
    onClearAll();
    toast({ title: 'All notifications cleared' });
    // TODO: Call backend to clear all
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'invite': return <UserPlus className="w-4 h-4 text-green-600 mr-2" />;
      case 'mention': return <AlertCircle className="w-4 h-4 text-blue-600 mr-2" />;
      case 'comment': return <CheckCircle className="w-4 h-4 text-purple-600 mr-2" />;
      case 'team': return <UserPlus className="w-4 h-4 text-yellow-600 mr-2" />;
      case 'system': return <AlertCircle className="w-4 h-4 text-gray-500 mr-2" />;
      default: return <Bell className="w-4 h-4 mr-2" />;
    }
  };

  return (
    <div className="relative inline-block text-left">
      <Button variant={'ghost' as const} size={'icon' as const} onClick={() => setOpen(o => !o)} aria-label="Notifications">
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-1.5 py-0.5 font-bold">{unreadCount}</span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="font-semibold text-sm">Notifications</span>
            <Button variant={'ghost' as const} size={'sm' as const} onClick={handleClearAll}><Trash2 className="w-4 h-4 mr-1" />Clear All</Button>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y">
            {notifications.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
            )}
            {notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-2 px-4 py-3 ${n.read ? 'bg-white' : 'bg-blue-50'}`}>
                {getIcon(n.type)}
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{n.message}</div>
                  <div className="text-xs text-gray-400 mt-1">{n.timestamp}</div>
                </div>
                {!n.read && (
                  <Button variant={'ghost' as const} size={'sm' as const} onClick={() => handleMarkRead(n.id)}><CheckCircle className="w-4 h-4 mr-1" />Mark Read</Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 