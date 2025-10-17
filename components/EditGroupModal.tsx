import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { StudyGroup } from '../types';
import Spinner from './Spinner';
import { useAuth } from '../hooks/useAuth';

interface EditGroupModalProps {
    group: StudyGroup;
    onClose: () => void;
    onSuccess: () => void;
}

const EditGroupModal: React.FC<EditGroupModalProps> = ({ group, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [name, setName] = useState(group.name);
    const [description, setDescription] = useState(group.description || '');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(group.avatar_url);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };
    
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let newAvatarUrl = group.avatar_url;
            if (avatarFile) {
                const filePath = `group-avatars/${group.id}/${Date.now()}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile, { upsert: true });

                if (uploadError) throw uploadError;
                
                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
                newAvatarUrl = `${publicUrl}?t=${new Date().getTime()}`;
            }

            const { error: updateError } = await supabase.from('study_groups')
                .update({ name, description, avatar_url: newAvatarUrl })
                .eq('id', group.id);

            if (updateError) throw updateError;
            
            onSuccess();
            onClose();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const inputClasses = "w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-heading";
    const labelClasses = "block text-sm font-medium text-text-body mb-1";

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-heading">Edit Group Details</h2>
                     <button onClick={onClose} className="text-text-muted hover:text-text-heading">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleUpdate} className="p-6 space-y-4">
                     <div className="flex flex-col items-center">
                        <img src={preview || `https://avatar.vercel.sh/${group.id}.png?text=${group.name[0]}`} alt="Avatar preview" className="w-24 h-24 rounded-full object-cover mb-2"/>
                        <label className="cursor-pointer text-sm font-semibold text-primary hover:underline">
                            Change Group Photo
                            <input type="file" onChange={handleFileChange} accept="image/*" className="hidden"/>
                        </label>
                    </div>
                    <div>
                        <label className={labelClasses}>Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClasses} required/>
                    </div>
                    <div>
                        <label className={labelClasses}>Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className={inputClasses} rows={3} />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="bg-slate-100 text-text-body px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold">Cancel</button>
                        <button type="submit" disabled={loading} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[90px] font-semibold">
                            {loading ? <Spinner size="sm"/> : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditGroupModal;
