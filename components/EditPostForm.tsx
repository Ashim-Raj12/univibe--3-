import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { PostWithProfile } from '../types';
import Spinner from './Spinner';

interface EditPostFormProps {
    post: PostWithProfile;
    onSuccess: () => void;
    onCancel: () => void;
}

const EditPostForm: React.FC<EditPostFormProps> = ({ post, onSuccess, onCancel }) => {
    const [content, setContent] = useState(post.content);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(post.image_url);
    const [isRemovingImage, setIsRemovingImage] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreview(URL.createObjectURL(file));
            setIsRemovingImage(false);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setPreview(null);
        setIsRemovingImage(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        let newImageUrl = post.image_url;
        const oldImagePath = post.image_url ? post.image_url.split('/posts/')[1] : null;

        try {
            // Step 1: Upload new image if it exists
            if (imageFile) {
                const filePath = `${post.user_id}/${Date.now()}_${imageFile.name}`;
                const { data, error: uploadError } = await supabase.storage
                    .from('posts')
                    .upload(filePath, imageFile);

                if (uploadError) throw uploadError;
                if (!data?.path) throw new Error("File upload failed, please try again.");
                
                const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(data.path);
                newImageUrl = publicUrl;
            } else if (isRemovingImage) {
                newImageUrl = null;
            }

            // Step 2: Update the post record in the database
            const { error: updateError } = await supabase
                .from('posts')
                .update({
                    content,
                    image_url: newImageUrl,
                })
                .eq('id', post.id);

            if (updateError) throw updateError;
            
            // Step 3: If database update is successful, clean up old image from storage
            if (oldImagePath && newImageUrl !== post.image_url) {
                 const { error: deleteError } = await supabase.storage.from('posts').remove([oldImagePath]);
                 if (deleteError) {
                    // This is not a critical error, so we just log it and proceed.
                    console.error("Failed to delete old image from storage:", deleteError);
                 }
            }
            
            onSuccess();

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleUpdate} className="space-y-4 mt-4 pt-4 border-t border-slate-200/60">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3 bg-dark-card border-2 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-on-dark placeholder:text-text-muted text-base resize-none transition-all"
                rows={4}
            />
            {preview && (
                <div className="relative">
                    <img src={preview} alt="Preview" className="max-h-80 rounded-lg object-cover w-full" />
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/75">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-between items-center">
                 <label className="cursor-pointer text-primary/80 hover:text-primary transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <input type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                 </label>
                <div className="flex gap-2">
                    <button type="button" onClick={onCancel} className="bg-slate-100 text-text-body px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[100px] font-semibold">
                        {loading ? <Spinner size="sm" /> : 'Save'}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default EditPostForm;