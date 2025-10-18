import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PostWithProfile } from '../types';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CommentSection from './CommentSection';
import EditPostForm from './EditPostForm';
import Spinner from './Spinner';
import VerifiedBadge from './VerifiedBadge';
import ReportModal from './ReportModal';

interface PostCardProps {
    post: PostWithProfile;
    onPostDeleted: (postId: number) => void;
    onPostUpdated: () => void;
    defaultShowComments?: boolean;
    hideOwnerControls?: boolean;
}

const GradientAvatar: React.FC<{ src?: string | null, alt: string, size?: string }> = ({ src, alt, size = 'h-11 w-11' }) => (
    <div className={`p-0.5 rounded-full bg-gradient-to-br from-primary to-secondary ${size} flex-shrink-0`}>
        <div className="w-full h-full p-0.5 bg-white rounded-full overflow-hidden">
            <img
                src={src || `https://avatar.vercel.sh/${alt}.png?text=UV`}
                alt={alt}
                className="w-full h-full rounded-full object-cover"
            />
        </div>
    </div>
);

const GenericFileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
);
const PdfFileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A1 1 0 0111 2.586L15.414 7A1 1 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);

const FileIcon: React.FC<{ fileName: string }> = ({ fileName }) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return <PdfFileIcon />;
    return <GenericFileIcon />;
};

const PostCard: React.FC<PostCardProps> = ({ post, onPostDeleted, onPostUpdated, defaultShowComments = false, hideOwnerControls = false }) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showComments, setShowComments] = useState(defaultShowComments);
    const [isReporting, setIsReporting] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const [likeCount, setLikeCount] = useState(post.likes.length);
    const [isLikedByUser, setIsLikedByUser] = useState(
        useMemo(() => post.likes.some(like => like.user_id === user?.id), [post.likes, user?.id])
    );
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const commentCount = post.comments[0]?.count ?? 0;

    const isOwner = user?.id === post.user_id;

    // Derived state for special post types
    const isStudyMaterial = useMemo(() => post.content.includes('#studymaterial'), [post.content]);
    const isFilePost = useMemo(() => post.image_url?.startsWith('file://'), [post.image_url]);
    
    const { fileUrl, fileName, title, displayContent } = useMemo(() => {
        let fileUrl: string | null = null;
        let fileName = 'Download File';
        let title = '';
        let displayContent = post.content;

        if (isFilePost && post.image_url) {
            try {
                const url = new URL(post.image_url.substring(7));
                fileUrl = url.origin + url.pathname;
                fileName = decodeURIComponent(url.searchParams.get('filename') || fileName);
            } catch (e) {
                console.error("Invalid file URL in post", e);
            }
        }

        if (isStudyMaterial) {
            const lines = post.content.split('\n');
            const titleLine = lines.find(line => line.startsWith('## '));
            if (titleLine) {
                title = titleLine.substring(3).trim();
                displayContent = lines.filter(line => !line.startsWith('## ') && !line.includes('#studymaterial')).join('\n').trim();
            } else {
                displayContent = post.content.replace('#studymaterial', '').trim();
            }
        }

        return { fileUrl, fileName, title, displayContent };
    }, [post.content, post.image_url, isFilePost, isStudyMaterial]);


    useEffect(() => {
        if (!post.id) return;

        const channel = supabase
            .channel(`post-likes-${post.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'likes',
                    filter: `post_id=eq.${post.id}`,
                },
                async () => {
                    const { count, error } = await supabase
                        .from('likes')
                        .select('*', { count: 'exact', head: true })
                        .eq('post_id', post.id);
                    
                    if (count !== null) {
                        setLikeCount(count);
                    }

                    if (user) {
                        const { data: userLike, error: userLikeError } = await supabase
                            .from('likes')
                            .select('id')
                            .match({ post_id: post.id, user_id: user.id })
                            .limit(1)
                            .maybeSingle();
                        
                        if (!userLikeError) {
                          setIsLikedByUser(!!userLike);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [post.id, user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleLikeToggle = async () => {
        if (!user || isLikeLoading) return;

        setIsLikeLoading(true);

        const initiallyLiked = isLikedByUser;
        setIsLikedByUser(!initiallyLiked);
        setLikeCount(prev => initiallyLiked ? prev - 1 : prev + 1);
        
        const { error } = await supabase.rpc('toggle_like_and_notify', {
            p_post_id: post.id,
            p_post_owner_id: post.user_id,
        });
        
        if (error) {
            setIsLikedByUser(initiallyLiked);
            setLikeCount(prev => initiallyLiked ? prev + 1 : prev - 1);
            console.error("Error toggling like:", error);
        }
        
        setIsLikeLoading(false);
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        
        setIsDeleting(true);
        setError(null);
        
        try {
            const { error: deleteError } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id);

            if (deleteError) {
                throw deleteError;
            }

            if (post.image_url) {
                // Handle both image and file post cleanup
                let storagePath;
                if (isFilePost) {
                    const url = new URL(post.image_url.substring(7));
                    storagePath = url.pathname.split('/community-files/')[1];
                } else {
                    storagePath = post.image_url.split('/posts/')[1];
                }

                if (storagePath) {
                    const fromBucket = isFilePost ? 'community-files' : 'posts';
                    const { error: storageError } = await supabase.storage.from(fromBucket).remove([storagePath]);
                    if (storageError) {
                        console.error("Failed to delete orphaned file from storage:", storageError);
                    }
                }
            }
            
            onPostDeleted(post.id);

        } catch (e: any) {
            setError(`Failed to delete post: ${e.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdateSuccess = () => {
        setIsEditing(false);
        onPostUpdated();
    }

    const likeButtonClasses = `flex items-center gap-1.5 text-sm font-semibold transition-all duration-300 p-2 rounded-xl ${
        isLikedByUser ? 'text-secondary bg-sky-50' : 'text-text-body hover:bg-slate-100'
    }`;
    
    const commentButtonText = () => {
        if (showComments) return 'Hide Comments';
        if (commentCount === 0) return 'Comment';
        if (commentCount === 1) return '1 Comment';
        return `${commentCount} Comments`;
    };

    const handleReportClick = () => {
        setIsMenuOpen(false);
        setIsReporting(true);
    };

    return (
        <div className="bg-card p-5 sm:p-6 rounded-2xl shadow-soft border border-slate-200/50 transition-all duration-300">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <Link to={`/profile/${post.profiles?.id}`}>
                    <GradientAvatar src={post.profiles?.avatar_url} alt={post.user_id} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/profile/${post.profiles?.id}`} className="font-bold text-text-heading hover:underline">
                                {post.profiles?.name}
                            </Link>
                            {post.profiles?.is_verified && <VerifiedBadge />}
                            {post.profiles?.profile_remark && (
                                <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-md line-clamp-1">
                                    {post.profiles.profile_remark}
                                </span>
                            )}
                        </div>
                        {post.profiles?.username && (
                            <span className="text-sm text-text-muted">@{post.profiles.username}</span>
                        )}
                        <p className="text-xs text-text-muted">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                    </div>
                </div>
                {!hideOwnerControls && !isEditing && (
                    <div ref={menuRef} className="relative">
                        <button onClick={() => setIsMenuOpen(p => !p)} className="p-2 text-text-muted hover:text-primary rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                        </button>
                        {isMenuOpen && (
                            <div className="absolute top-full right-0 mt-1 w-36 bg-card rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                                {isOwner ? (
                                    <>
                                        <button onClick={() => { setIsEditing(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-body hover:bg-slate-100">Edit</button>
                                        <button onClick={handleDelete} disabled={isDeleting} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
                                            {isDeleting ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={handleReportClick} className="w-full text-left px-4 py-2 text-sm text-text-body hover:bg-slate-100">Report</button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {error && <p className="text-red-500 text-sm mt-2 text-right">{error}</p>}
            
            {isEditing ? (
                <EditPostForm post={post} onSuccess={handleUpdateSuccess} onCancel={() => setIsEditing(false)} />
            ) : (
                <>
                    <div className="my-4">
                        {title && <h2 className="text-xl font-bold mb-2 text-text-heading">{title}</h2>}
                        {displayContent && <div className="text-text-body leading-relaxed"><ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown></div>}
                    </div>

                    {post.image_url && !isFilePost && (
                        <div className="-mx-5 sm:-mx-6 rounded-t-none">
                            <img src={post.image_url} alt="Post" className="w-full h-auto max-h-[600px] object-cover bg-slate-50" />
                        </div>
                    )}
                    
                    {fileUrl && (
                        <div className="mt-4 border-t border-slate-200/60 pt-4">
                             <a href={fileUrl} target="_blank" rel="noopener noreferrer" download={fileName} className="p-3 flex items-center gap-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                <div className="text-text-muted flex-shrink-0">
                                    <FileIcon fileName={fileName} />
                                </div>
                                <div className="flex-grow overflow-hidden">
                                    <p className="font-semibold text-text-heading truncate">{fileName}</p>
                                    <p className="text-xs text-text-muted">Click to view or download</p>
                                </div>
                                <div className="p-2 text-text-muted" aria-label="Download file">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </div>
                            </a>
                        </div>
                    )}

                    <div className="pt-3 mt-4 flex items-center gap-2 border-t border-slate-200/60">
                        <button onClick={handleLikeToggle} disabled={isLikeLoading} className={likeButtonClasses}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                        <span>{likeCount}</span>
                        </button>
                        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-sm font-semibold text-text-body hover:bg-slate-100 p-2 rounded-xl transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            <span>{commentButtonText()}</span>
                        </button>
                    </div>

                    {showComments && <CommentSection postId={post.id} postOwnerId={post.user_id} />}
                </>
            )}
        
            {isReporting && (
                <ReportModal
                    entityType="post"
                    entityId={post.id}
                    onClose={() => setIsReporting(false)}
                    onSuccess={() => {
                        setIsReporting(false);
                        alert('Thank you for your report. Our moderation team will review it.');
                    }}
                />
            )}
        </div>
    );
};

export default PostCard;