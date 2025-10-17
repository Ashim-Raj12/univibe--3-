

import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';

interface CreateCommunityModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({ onClose, onSuccess }) => {
    const { user, profile } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setBannerFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !profile || !name.trim()) return;

        setLoading(true);
        setError(null);
        
        try {
            let bannerUrl: string | null = null;
            if (bannerFile) {
                // NOTE: Assumes a 'banners' bucket exists in Supabase storage.
                const filePath = `${user.id}/community_${Date.now()}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('banners')
                    .upload(filePath, bannerFile);

                if (uploadError) throw uploadError;
                if (!uploadData?.path) throw new Error("Banner upload failed, please try again.");

                const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(uploadData.path);
                bannerUrl = publicUrl;
            }

            const { error: rpcError } = await supabase.rpc('create_community_and_add_creator', {
                community_name: name,
                community_description: description,
                banner_url: bannerUrl,
                college: profile.college,
            });

            if (rpcError) throw rpcError;
            
            onSuccess();

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };
    
    const inputClasses = "w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50";

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background rounded-lg shadow-xl w-full max-w-lg animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-heading">Create a Community</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-heading">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Community Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClasses} rows={3}></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Banner Image (Optional)</label>
                        {preview && <img src={preview} alt="Banner preview" className="w-full h-32 object-cover rounded-md mb-2"/>}
                        <input type="file" onChange={handleFileChange} accept="image/*" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="bg-slate-100 text-text-body px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold">
                            {loading ? <Spinner size="sm" /> : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCommunityModal;