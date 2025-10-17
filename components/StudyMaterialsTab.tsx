import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { PostWithProfile } from '../types';
import Spinner from './Spinner';
import PostCard from './PostCard';
import PostCardSkeleton from './PostCardSkeleton';

interface FileUploadFormProps {
    collegeName: string;
    onUploadSuccess: () => void;
}

const FileUploadForm: React.FC<FileUploadFormProps> = ({ collegeName, onUploadSuccess }) => {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !user || !title) return;

        setUploading(true);
        setError(null);

        try {
            // Using 'community-files' bucket as a general-purpose file store
            const filePath = `study-hub/${collegeName}/${user.id}/${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('community-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;
            if (!uploadData?.path) throw new Error("File upload failed, please try again.");

            const { data: { publicUrl } } = supabase.storage.from('community-files').getPublicUrl(uploadData.path);
            
            const content = `## ${title}\n\n${description || ''}\n\n#studymaterial`;
            const fileUrlForPost = `file://${publicUrl}?filename=${encodeURIComponent(file.name)}`;

            const { error: insertError } = await supabase.from('posts').insert({
                user_id: user.id,
                content,
                image_url: fileUrlForPost,
                community_id: null,
            });

            if (insertError) throw insertError;
            
            setFile(null);
            setTitle('');
            setDescription('');
            const fileInput = document.getElementById('study-material-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = "";
            
            onUploadSuccess();

        } catch (err: any) {
            setError(err.message);
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50">
            <h2 className="text-xl font-bold text-text-heading mb-4">Share a Resource</h2>
            <form onSubmit={handleUpload} className="space-y-4">
                 <div>
                    <label htmlFor="file-title" className="block text-sm font-medium text-text-body mb-2">Title</label>
                    <input id="file-title" type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., CS101 Midterm Study Guide" className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"/>
                </div>
                <div>
                    <label htmlFor="study-material-upload" className="block text-sm font-medium text-text-body mb-2">File (PDF, DOC, PPT, etc.)</label>
                    <input id="study-material-upload" type="file" onChange={handleFileChange} required className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary hover:file:bg-blue-100"/>
                </div>
                <div>
                    <label htmlFor="file-description" className="block text-sm font-medium text-text-body mb-2">Description (Optional)</label>
                    <textarea id="file-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this resource about?" className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300" rows={2}></textarea>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="text-right">
                    <button type="submit" disabled={uploading || !file || !title} className="bg-primary text-white px-6 py-2 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:opacity-50 flex items-center justify-center min-w-[120px] font-semibold ml-auto shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5">
                        {uploading ? <Spinner size="sm" /> : 'Share'}
                    </button>
                </div>
            </form>
        </div>
    );
};


const StudyMaterialsTab: React.FC<{ collegeName: string; }> = ({ collegeName }) => {
    const [posts, setPosts] = useState<PostWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('posts')
            .select('*, profiles!inner(*), likes(*), comments!inner(count)')
            .eq('profiles.college', collegeName)
            .like('content', '%#studymaterial%')
            .is('community_id', null)
            .order('created_at', { ascending: false });

        if (error) {
            setError(error.message);
        } else {
            setPosts(data as any);
        }
        setLoading(false);
    }, [collegeName]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);
    
    const handlePostDeleted = (postId: number) => {
        setPosts(prev => prev.filter(p => p.id !== postId));
    };

    return (
        <div className="space-y-6">
            <FileUploadForm collegeName={collegeName} onUploadSuccess={fetchPosts} />
            
            <h2 className="text-xl font-bold text-text-heading pt-4">Shared Resources</h2>

            {loading && (
                <div className="space-y-6">
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                </div>
            )}

            {error && <p className="text-center text-red-500">{error}</p>}
            
            {!loading && posts.length === 0 && (
                <div className="text-center text-gray-500 py-10 bg-slate-50 rounded-xl">
                    No study materials have been shared for your college yet. Be the first!
                </div>
            )}
            
            {!loading && posts.length > 0 && (
                <div className="space-y-6">
                    {posts.map(post => (
                        <PostCard 
                            key={post.id} 
                            post={post} 
                            onPostDeleted={handlePostDeleted} 
                            onPostUpdated={fetchPosts} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudyMaterialsTab;