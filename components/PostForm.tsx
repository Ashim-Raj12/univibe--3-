import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';

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

const PostForm: React.FC<{ onNewPost: () => void; communityId?: number; isPostingRestricted?: boolean }> = ({ onNewPost, communityId, isPostingRestricted = false }) => {
    const { user, profile } = useAuth();
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };
    
    const removeImage = () => {
        setImageFile(null);
        setPreview(null);
        const fileInput = document.getElementById('post-image-upload') as HTMLInputElement;
        if(fileInput) fileInput.value = "";
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && !imageFile) return;
        if (!user || isPostingRestricted) return;

        setLoading(true);
        setError(null);

        try {
            let imageUrl: string | null = null;

            if (imageFile) {
                const filePath = `${user.id}/${Date.now()}_${imageFile.name}`;
                const { data, error: uploadError } = await supabase.storage
                    .from('posts')
                    .upload(filePath, imageFile);

                if (uploadError) throw uploadError;
                if (!data?.path) throw new Error("File upload failed, please try again.");
                
                const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(data.path);
                imageUrl = publicUrl;
            }
            
            const postData: {
                content: string;
                image_url: string | null;
                user_id: string;
                community_id?: number | null;
            } = {
                content: content.trim(),
                image_url: imageUrl,
                user_id: user.id,
                community_id: communityId || null
            };

            const { error: insertError } = await supabase
                .from('posts')
                .insert(postData);

            if (insertError) throw insertError;
            
            setContent('');
            setImageFile(null);
            setPreview(null);
            onNewPost();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (isPostingRestricted) {
        return (
            <div className="p-4 text-center bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
                <p className="font-bold">Posting Restricted</p>
                <p className="text-sm">You do not have permission to post in this community.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="p-4">
            <div className="flex items-start gap-4">
                <GradientAvatar src={profile?.avatar_url} alt={user?.id || 'user'} />
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`What's on your mind, ${profile?.name ? profile.name.split(' ')[0] : 'User'}?`}
                    className="w-full p-3 bg-dark-card border-2 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-on-dark placeholder:text-text-muted text-base resize-none transition-all"
                    rows={3}
                />
            </div>
            {preview && (
                 <div className="mt-4 pl-14 relative">
                    <img src={preview} alt="Preview" className="max-h-80 rounded-lg object-cover w-full" />
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/75 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
            {error && <p className="text-red-500 text-sm mt-2 text-right">{error}</p>}
            <div className="flex justify-between items-center mt-3 pl-14">
                <label className="cursor-pointer text-primary/80 hover:text-primary transition-colors p-2 -ml-2 rounded-full">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <input id="post-image-upload" type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                </label>
                <button type="submit" disabled={loading || (!content.trim() && !imageFile)} className="bg-primary text-white px-6 py-2 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:bg-slate-400 flex items-center justify-center min-w-[100px] font-semibold shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5 active:scale-95">
                    {loading ? <Spinner size="sm" /> : 'Post'}
                </button>
            </div>
        </form>
    );
};

export default PostForm;