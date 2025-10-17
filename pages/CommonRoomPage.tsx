import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { PostWithProfile } from '../types';
import PostCard from '../components/PostCard';
import { useAuth } from '../hooks/useAuth';
import PostCardSkeleton from '../components/PostCardSkeleton';
import PostForm from '../components/PostForm';
import Spinner from '../components/Spinner';

const POSTS_PER_PAGE = 10;

const CommonRoomPage: React.FC = () => {
    const { profile } = useAuth();
    const [posts, setPosts] = useState<PostWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const fetchPosts = useCallback(async (isNew = false) => {
        if (isNew) {
            setLoading(true);
            setPage(0); // Reset page for new fetch
        } else {
            setLoadingMore(true);
        }
        setError(null);

        const currentPage = isNew ? 0 : page;
        const from = currentPage * POSTS_PER_PAGE;
        const to = from + POSTS_PER_PAGE - 1;

        let query = supabase
            .from('posts')
            .select('*, profiles!inner(*), likes(*), comments!inner(count)')
            .is('community_id', null) // Fetch only posts not in a community
            .order('created_at', { ascending: false })
            .range(from, to);
        
        const { data, error } = await query;

        if (error) {
            console.error('Error fetching posts:', error);
            setError(error.message);
        } else if (data) {
            if (isNew) {
                setPosts(data as any);
            } else {
                setPosts(prev => [...prev, ...(data as any)]);
            }
            
            if (data.length < POSTS_PER_PAGE) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
            setPage(prev => prev + 1);
        }

        setLoading(false);
        setLoadingMore(false);
    }, [page]);

    useEffect(() => {
        fetchPosts(true);
    
        const channel = supabase
          .channel('common-room-posts')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'posts', filter: 'community_id=is.null' },
            () => fetchPosts(true)
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'posts' },
            (payload) => {
                setPosts(current => current.filter(p => p.id !== (payload.old as any).id));
            }
          )
          .subscribe();
    
        return () => {
          supabase.removeChannel(channel);
        };
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

    const handlePostDeleted = (postId: number) => {
        setPosts(posts.filter(p => p.id !== postId));
    };
    
    const renderContent = () => {
        if (loading) {
            return (
                <div className="space-y-6">
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                </div>
            );
        }

        if (error) {
            return <p className="text-center text-red-500">{error}</p>;
        }

        if (posts.length === 0) {
            return <p className="text-center text-gray-500 bg-card p-10 rounded-2xl border border-slate-200/50">Welcome to the Common Room! No posts here yet.</p>;
        }

        return (
            <div className="space-y-6">
                {posts.map(post => (
                    <PostCard key={post.id} post={post} onPostDeleted={handlePostDeleted} onPostUpdated={() => fetchPosts(true)} />
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-text-heading">Welcome to the Common Room, {profile?.name ? profile.name.split(' ')[0] : 'User'}!</h1>
            
            <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50">
                <PostForm onNewPost={() => fetchPosts(true)} />
            </div>
            
            {renderContent()}

            {!loading && posts.length > 0 && hasMore && (
                <div className="text-center">
                    <button
                        onClick={() => fetchPosts()}
                        disabled={loadingMore}
                        className="bg-primary text-white px-6 py-2 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:opacity-50 flex items-center justify-center min-w-[150px] font-semibold shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5 mx-auto"
                    >
                        {loadingMore ? <Spinner size="sm" /> : 'Load More'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default CommonRoomPage;