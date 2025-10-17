import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { PostWithProfile } from '../types';
import PostCard from '../components/PostCard';
import Spinner from '../components/Spinner';

const PostPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<PostWithProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPost = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);

        try {
            const postId = parseInt(id, 10);
            if(isNaN(postId)) throw new Error("Invalid post ID.");

            const { data, error: fetchError } = await supabase
                .from('posts')
                .select('*, profiles!inner(*), likes(*), comments!inner(count)')
                .eq('id', postId)
                .single();

            if (fetchError) {
                throw fetchError;
            } else {
                setPost(data as any);
            }
        } catch (e: any) {
            setError(e.message.includes('0 rows') ? "Post not found." : e.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPost();
    }, [fetchPost]);

    const handlePostDeleted = () => {
        // After deleting, navigate home.
        navigate('/home', { replace: true });
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    }

    if (error) {
        return <p className="text-center text-red-500 p-8">{error}</p>;
    }

    if (!post) {
        return <p className="text-center text-gray-500 p-8">Could not load post.</p>;
    }

    return (
        <div className="max-w-2xl mx-auto">
             <div className="mb-4">
                <button onClick={() => navigate(-1)} className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back
                </button>
            </div>
            <PostCard
                post={post}
                onPostDeleted={handlePostDeleted}
                onPostUpdated={fetchPost}
                defaultShowComments={true}
            />
        </div>
    );
};

export default PostPage;