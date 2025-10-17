import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { CommentWithProfile, ReplyInfo } from '../types';
import Spinner from './Spinner';
import { formatDistanceToNow } from 'date-fns';
import VerifiedBadge from './VerifiedBadge';

interface CommentSectionProps {
    postId: number;
    postOwnerId: string;
}

// --- Helper Functions for Reply ---
const REPLY_PREFIX = '[REPLY::';
const REPLY_SUFFIX = '::REPLY]';
const REPLY_REGEX = /^\[REPLY::(.*?)::REPLY\](.*)$/s;

const formatReplyContent = (replyInfo: ReplyInfo, mainContent: string): string => {
    return `${REPLY_PREFIX}${JSON.stringify(replyInfo)}${REPLY_SUFFIX}${mainContent}`;
};

const parseReply = (content: string | null): { replyInfo: ReplyInfo | null; mainContent: string } => {
    if (!content) {
        return { replyInfo: null, mainContent: '' };
    }

    const match = content.match(REPLY_REGEX);

    if (!match) {
        return { replyInfo: null, mainContent: content };
    }

    try {
        const jsonPart = match[1];
        const mainContent = match[2];
        const replyInfo = JSON.parse(jsonPart);
        return { replyInfo, mainContent };
    } catch (e) {
        console.error("Failed to parse reply JSON:", e, "Content:", content);
        // Fallback if JSON is malformed
        return { replyInfo: null, mainContent: content };
    }
}

const GradientAvatar: React.FC<{ src?: string | null, alt: string, size?: string }> = ({ src, alt, size = 'h-11 w-11' }) => (
    <div className={`p-0.5 rounded-full bg-gradient-to-br from-primary to-secondary ${size} flex-shrink-0`}>
        <div className="p-0.5 bg-white rounded-full">
            <img
                src={src || `https://avatar.vercel.sh/${alt}.png?text=UV`}
                alt={alt}
                className="w-full h-full rounded-full object-cover"
            />
        </div>
    </div>
);

const CommentItem: React.FC<{ comment: CommentWithProfile, canDelete: boolean, onDelete: (id: number) => void, onReply: (comment: CommentWithProfile) => void }> = ({ comment, canDelete, onDelete, onReply }) => {
    const { replyInfo, mainContent } = parseReply(comment.content);
    
    return (
        <div className="group flex items-start gap-3 py-2">
            <GradientAvatar src={comment.profiles?.avatar_url} alt={comment.user_id} />
            <div className="flex-1">
                <div className="bg-slate-100 rounded-lg px-3 py-2 inline-block">
                    <div className="flex items-center gap-1">
                        <p className="font-bold text-sm text-text-heading">{comment.profiles?.name}</p>
                        {comment.profiles?.is_verified && <VerifiedBadge size="h-4 w-4" />}
                    </div>
                    {replyInfo && (
                        <div className="border-l-2 border-primary/50 pl-2 mt-2 text-xs">
                            <p className="font-semibold text-text-body">{replyInfo.senderName}</p>
                            <p className="text-text-muted truncate">{replyInfo.content}</p>
                        </div>
                    )}
                    <p className="text-text-body text-sm whitespace-pre-wrap mt-1">{mainContent}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted mt-1 ml-3">
                    <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                    <button onClick={() => onReply(comment)} className="font-semibold hover:underline">Reply</button>
                </div>
            </div>
            {canDelete && (
                <button 
                    onClick={() => onDelete(comment.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red-500 p-1"
                    aria-label="Delete comment"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            )}
        </div>
    );
};

const CommentForm: React.FC<{ postId: number; postOwnerId: string; replyingTo: CommentWithProfile | null; onCancelReply: () => void }> = ({ postId, postOwnerId, replyingTo, onCancelReply }) => {
    const { user, profile } = useAuth();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !user) return;

        setLoading(true);

        let finalContent = content.trim();
        if (replyingTo) {
            const replyInfo: ReplyInfo = {
                id: replyingTo.id,
                content: parseReply(replyingTo.content).mainContent,
                senderId: replyingTo.user_id,
                senderName: replyingTo.profiles.name || '',
            };
            finalContent = formatReplyContent(replyInfo, finalContent);
        }

        const { error } = await supabase.rpc('add_comment_and_notify', {
            p_post_id: postId,
            p_content: finalContent,
            p_post_owner_id: postOwnerId
        });

        if (error) {
            console.error("Error posting comment:", error);
        } else {
            setContent('');
            onCancelReply();
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="pt-4">
             {replyingTo && (
                <div className="text-xs text-text-muted mb-2 px-3 flex justify-between items-center bg-slate-100 p-2 rounded-t-lg">
                    <span>Replying to <strong>{replyingTo.profiles.name}</strong></span>
                    <button type="button" onClick={onCancelReply} className="font-bold text-lg leading-none">&times;</button>
                </div>
            )}
            <div className="flex items-start gap-3">
                <GradientAvatar src={profile?.avatar_url} alt={user?.id || 'user'} />
                <div className="w-full relative flex items-center">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full pl-4 pr-12 py-2 bg-dark-card border-none rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-on-dark placeholder:text-text-muted text-sm resize-none"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                    />
                    <button type="submit" disabled={loading || !content.trim()} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white bg-primary disabled:bg-slate-500 hover:bg-primary-focus transition-colors rounded-full p-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                    </button>
                </div>
            </div>
        </form>
    );
};

const CommentSection: React.FC<CommentSectionProps> = ({ postId, postOwnerId }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<CommentWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<CommentWithProfile | null>(null);

    const fetchComments = useCallback(async () => {
        const { data, error } = await supabase
            .from('comments')
            .select('*, profiles(*)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) setError(error.message);
        else setComments(data as CommentWithProfile[]);
        setLoading(false);
    }, [postId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);
    
    const handleDeleteComment = async (commentId: number) => {
        setComments(prev => prev.filter(c => c.id !== commentId));
        const { error } = await supabase.from('comments').delete().eq('id', commentId);
        if (error) {
            console.error("Error deleting comment:", error);
            fetchComments(); // Revert on error
        }
    }

    useEffect(() => {
        const channel = supabase
            .channel(`comments-for-post-${postId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
                async (payload) => {
                     const { data: newComment, error } = await supabase
                        .from('comments')
                        .select('*, profiles(*)')
                        .eq('id', payload.new.id)
                        .single();

                    if (error) {
                        console.error('Error fetching new comment with profile:', error);
                    } else if (newComment) {
                        setComments(currentComments => {
                            if (currentComments.some(c => c.id === newComment.id)) return currentComments;
                            return [...currentComments, newComment as CommentWithProfile];
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
                (payload) => {
                    setComments(current => current.filter(c => c.id !== (payload.old as any).id));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [postId, fetchComments]);

    if (loading) {
        return <div className="flex justify-center p-4"><Spinner size="sm"/></div>;
    }

    if (error) {
        return <p className="text-red-500 text-sm p-4">Could not load comments.</p>;
    }

    return (
        <div className="pt-2 mt-2">
            <div className="space-y-1">
                {comments.length === 0 && (
                    <p className="text-sm text-text-muted text-center py-2">No comments yet. Be the first to comment!</p>
                )}
                {comments.map(comment => {
                    const canDelete = user?.id === comment.user_id || user?.id === postOwnerId;
                    return <CommentItem key={comment.id} comment={comment} canDelete={canDelete} onDelete={handleDeleteComment} onReply={setReplyingTo} />
                })}
            </div>
            <CommentForm postId={postId} postOwnerId={postOwnerId} replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} />
        </div>
    );
};

export default CommentSection;