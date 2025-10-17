

import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import Spinner from './Spinner';

interface AdminCreateCommunityFormProps {
    onSuccess: () => void;
}

const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .replace(/\s+/g, ' ') // Collapse whitespace
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const AdminCreateCommunityForm: React.FC<AdminCreateCommunityFormProps> = ({ onSuccess }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [college, setCollege] = useState('');
    const [creatorEmail, setCreatorEmail] = useState('');
    const [isVerified, setIsVerified] = useState(true);
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
        setLoading(true);
        setError(null);
        let bannerUrl: string | null = null;

        try {
            if (bannerFile) {
                const filePath = `admin/community_${Date.now()}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('banners')
                    .upload(filePath, bannerFile);

                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(uploadData.path);
                bannerUrl = publicUrl;
            }

            const { error: rpcError } = await supabase.rpc('admin_create_community', {
                community_name: name,
                community_description: description,
                banner_url: bannerUrl,
                college: toTitleCase(college),
                is_verified: isVerified,
                creator_email: creatorEmail,
            });

            if (rpcError) throw rpcError;
            
            // Reset form
            setName('');
            setDescription('');
            setCollege('');
            setCreatorEmail('');
            setBannerFile(null);
            setPreview(null);
            
            onSuccess();

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };
    
    const inputClasses = "w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";

    return (
        <div className="bg-card p-4 rounded-lg shadow-sm border border-slate-200/80">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-text-body mb-1">Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} required />
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-body mb-1">Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClasses} rows={3}></textarea>
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-body mb-1">College</label>
                    <input type="text" value={college} onChange={(e) => setCollege(e.target.value)} className={inputClasses} required />
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-body mb-1">Creator's Email</label>
                    <input type="email" value={creatorEmail} onChange={(e) => setCreatorEmail(e.target.value)} className={inputClasses} required />
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-body mb-1">Banner Image</label>
                    {preview && <img src={preview} alt="Banner preview" className="w-full h-24 object-cover rounded-md mb-2"/>}
                    <input type="file" onChange={handleFileChange} accept="image/*" className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                </div>
                <div className="flex items-center gap-2">
                    <input type="checkbox" id="isVerified" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                    <label htmlFor="isVerified" className="text-sm font-medium text-text-body">Mark as Verified</label>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="text-right">
                    <button type="submit" disabled={loading} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold text-sm">
                        {loading ? <Spinner size="sm" /> : 'Create Community'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminCreateCommunityForm;