import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { getComments, addComment } from '@/lib/api';
import type { Idea, Comment } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface CommentSectionProps {
  idea: Idea;
  teamMembers?: { id: string; name: string; email: string }[]; // Optional, fallback to context
}

export const CommentSection: React.FC<CommentSectionProps> = ({ idea, teamMembers }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionCandidates, setMentionCandidates] = useState<{ id: string; name: string; email: string }[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Get team members from props or context (future: context wiring)
  const members = teamMembers || [];

  useEffect(() => {
    fetchComments();
  }, [idea.id]);

  const fetchComments = async () => {
    try {
      const data = await getComments(idea.id);
      setComments(data);
    } catch (error) {
      toast({ title: "Error fetching comments", variant: "destructive" });
    }
  };

  // Basic @mention autocomplete logic
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);
    const match = value.match(/@([\w]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setShowMentions(true);
      setMentionCandidates(
        members.filter(m => m.name.toLowerCase().includes(match[1].toLowerCase()) || m.email.toLowerCase().includes(match[1].toLowerCase()))
      );
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const handleMentionSelect = (member: { id: string; name: string; email: string }) => {
    // Replace @query with @Name in textarea
    const newText = newComment.replace(/@([\w]*)$/, `@${member.name} `);
    setNewComment(newText);
    setShowMentions(false);
    setMentionQuery('');
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment(idea.id, newComment);
      setNewComment('');
      fetchComments();
      // Detect mentions and show notification toast
      const mentionMatches = newComment.match(/@([\w]+)/g);
      if (mentionMatches) {
        mentionMatches.forEach((mention) => {
          const name = mention.slice(1);
          const mentioned = members.find(m => m.name === name);
          if (mentioned) {
            toast({
              title: `Mentioned ${mentioned.name}`,
              description: `@${mentioned.name} will be notified.`,
            });
            // TODO: Trigger backend notification for mention here
          }
        });
      }
      toast({ title: "Comment added" });
    } catch (error) {
      toast({ title: "Error adding comment", variant: "destructive" });
    }
  };

  // Highlight mentions in comment text
  const renderCommentContent = (content: string) => {
    return content.split(/(@[\w]+)/g).map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-blue-600 font-semibold">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Comments & Feedback</h3>
      <div className="space-y-4">
        {comments.map(c => (
          <div key={c.id} className="p-3 border rounded">
            <p className="text-sm font-semibold">{c.user_id}</p>
            <p className="text-sm text-gray-700 mt-1">{renderCommentContent(c.content)}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(c.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 relative">
        <Textarea 
          placeholder="Leave a comment... Use @ to mention a teammate."
          value={newComment}
          onChange={handleCommentChange}
          spellCheck={false}
        />
        {showMentions && mentionCandidates.length > 0 && (
          <div className="absolute z-10 bg-white border rounded shadow w-64 max-h-40 overflow-y-auto mt-1">
            {mentionCandidates.map(m => (
              <div
                key={m.id}
                className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => handleMentionSelect(m)}
              >
                <span className="font-semibold">{m.name}</span> <span className="text-xs text-gray-500">({m.email})</span>
              </div>
            ))}
          </div>
        )}
        <Button onClick={handleAddComment}>Post Comment</Button>
      </div>
    </div>
  );
}; 