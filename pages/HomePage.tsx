import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { PostWithProfile } from '../types';
import PostCard from '../components/PostCard';
import Spinner from '../components/Spinner';
import SuggestedUsers from '../components/SuggestedUsers';
import { useAuth } from '../hooks/useAuth';
import PostCardSkeleton from '../components/PostCardSkeleton';
import PostForm from '../components/PostForm';

const POSTS_PER_PAGE = 10;

const HomePage: React.FC = () => {
    const { profile } = useAuth();
    const [posts, setPosts] = useState<PostWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const [collegeFilter, setCollegeFilter] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [debouncedCollege, setDebouncedCollege] = useState('');
    const [debouncedState, setDebouncedState] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedCollege(collegeFilter);
        }, 500);
        return () => clearTimeout(handler);
    }, [collegeFilter]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedState(stateFilter);
        }, 500);
        return () => clearTimeout(handler);
    }, [stateFilter]);

    const fetchPosts = useCallback(async (isNewFilter = false) => {
        if (isNewFilter) {
            setLoading(true);
            setPage(0); // Reset page for new filter
        } else {
            setLoadingMore(true);
        }
        setError(null);

        const currentPage = isNewFilter ? 0 : page;
        const from = currentPage * POSTS_PER_PAGE;
        const to = from + POSTS_PER_PAGE - 1;

        let query = supabase
            .from('posts')
            .select('*, profiles!inner(*), likes(*), comments!inner(count)')
            .order('created_at', { ascending: false })
            .range(from, to);

        if (debouncedCollege) {
            query = query.ilike('profiles.college', `%${debouncedCollege}%`);
        }
        if (debouncedState) {
            query = query.ilike('profiles.state', `%${debouncedState}%`);
        }
        
        const { data, error } = await query;

        if (error) {
            console.error('Error fetching posts:', error);
            setError(error.message);
        } else if (data) {
            if (isNewFilter) {
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
    }, [debouncedCollege, debouncedState, page]);

    useEffect(() => {
        // This effect runs when filters change
        fetchPosts(true);
    
        const channel = supabase
          .channel('posts-feed')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'posts' },
            () => {
                // A simple refetch on new posts. For a more advanced implementation,
                // we could check if the new post matches the filter and prepend it.
                fetchPosts(true);
            }
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
      }, [debouncedCollege, debouncedState]);

    const handlePostDeleted = (postId: number) => {
        setPosts(posts.filter(p => p.id !== postId));
    };
    
    const renderContent = () => {
        if (loading) {
            return (
                <div className="space-y-6">
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                </div>
            );
        }

        if (error) {
            return <p className="text-center text-red-500">{error}</p>;
        }

        if (posts.length === 0) {
            return <p className="text-center text-gray-500 bg-card p-10 rounded-2xl border border-slate-200/50">No posts found. Try adjusting your filters!</p>;
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
        <>
            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <h1 className="text-3xl font-bold text-text-heading">Welcome, {profile?.name ? profile.name.split(' ')[0] : 'User'}!</h1>
                    
                    <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50">
                        <PostForm onNewPost={() => fetchPosts(true)} />
                    </div>

                    <div className="bg-card p-4 rounded-2xl shadow-soft border border-slate-200/50">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                                </div>
                                <input 
                                    type="text"
                                    placeholder="Filter by college..."
                                    value={collegeFilter}
                                    onChange={e => setCollegeFilter(e.target.value)}
                                    className="w-full p-3 pl-10 bg-dark-card border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-on-dark placeholder:text-text-muted transition-all"
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                                <input 
                                    type="text"
                                    placeholder="Filter by state..."
                                    value={stateFilter}
                                    onChange={e => setStateFilter(e.target.value)}
                                    className="w-full p-3 pl-10 bg-dark-card border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-on-dark placeholder:text-text-muted transition-all"
                                />
                            </div>
                        </div>
                    </div>
                    {renderContent()}

                    {!loading && posts.length > 0 && hasMore && (
                        <div className="text-center">
                            <button
                                onClick={() => fetchPosts()}
                                disabled={loadingMore}
                                className="bg-primary text-white px-6 py-2 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:opacity-50 flex items-center justify-center min-w-[150px] font-semibold shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5 mx-auto active:scale-95"
                            >
                                {loadingMore ? <Spinner size="sm" /> : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
                <aside className="hidden lg:block space-y-6 sticky top-24">
                    {profile && (
                        <div className="bg-card p-4 rounded-2xl shadow-soft text-center border border-slate-200/50">
                            <img
                                src={profile.avatar_url || `https://avatar.vercel.sh/${profile.id}.png`}
                                alt={profile.name}
                                className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-4 border-slate-100"
                            />
                            <h2 className="font-bold text-xl text-text-heading">{profile.name}</h2>
                            <p className="text-sm text-text-body">{profile.college}</p>
                        </div>
                    )}
                    <SuggestedUsers />
                </aside>
            </div>
        </>
    );
};

export default HomePage;