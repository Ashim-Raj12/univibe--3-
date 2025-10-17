import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { PostWithProfile } from '../../types';
import PostCard from '../../components/PostCard';
import Spinner from '../../components/Spinner';

const AdminPostManagementPage: React.FC = () => {
    const [posts, setPosts] = useState<PostWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        setError(null);
        let query = supabase
            .from('posts')
            .select('*, profiles!inner(*), likes(*), comments!inner(count)')
            .order('created_at', { ascending: false });

        if (debouncedSearch) {
            query = query.ilike('content', `%${debouncedSearch}%`);
        }

        const { data, error } = await query.limit(50);
        
        if (error) {
            setError(error.message);
        } else {
            setPosts(data as any);
        }
        setLoading(false);
    }, [debouncedSearch]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleDeletePost = async (postId: number) => {
        if (!window.confirm('Are you sure you want to permanently delete this post?')) return;
        
        const { error } = await supabase.rpc('admin_delete_post', { post_id_to_delete: postId });
        if (error) {
            alert(`Failed to delete post: ${error.message}`);
        } else {
            setPosts(prev => prev.filter(p => p.id !== postId));
        }
    };
    
    const handlePostRemoved = (postId: number) => {
        setPosts(prev => prev.filter(p => p.id !== postId));
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Post Moderation</h1>
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search post content..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>
            
            {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> :
             error ? <p className="text-center text-red-500 p-8">{error}</p> :
             <div className="space-y-6">
                 {posts.length === 0 ? <p className="text-center text-gray-500 bg-white p-10 rounded-lg border">No posts found.</p> :
                    posts.map(post => (
                        <div key={post.id} className="relative">
                            <PostCard 
                                post={post} 
                                onPostDeleted={handlePostRemoved} 
                                onPostUpdated={fetchPosts}
                                hideOwnerControls={true} 
                            />
                             <div className="absolute top-4 right-4 z-10">
                                <button
                                    onClick={() => handleDeletePost(post.id)}
                                    className="px-3 py-1 rounded text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200"
                                >
                                    Admin Delete
                                </button>
                            </div>
                        </div>
                    ))
                 }
             </div>
            }
        </div>
    );
};

export default AdminPostManagementPage;