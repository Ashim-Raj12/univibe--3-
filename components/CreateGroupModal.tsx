import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';

interface CreateGroupModalProps {
    collegeName: string;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ collegeName, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'public' | 'private'>('public');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const { error: rpcError } = await supabase.rpc('create_study_group_and_add_creator', {
                p_name: name,
                p_description: description,
                p_college: collegeName,
                p_type: type,
            });

            if (rpcError) throw rpcError;
            onSuccess();

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="bg-background w-full h-full flex flex-col sm:h-auto sm:rounded-lg shadow-xl sm:max-w-lg animate-fade-in-up sm:animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-text-heading">Create a Study Group</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-heading">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Group Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClasses} rows={3}></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Group Type</label>
                        <select value={type} onChange={e => setType(e.target.value as 'public' | 'private')} className={inputClasses}>
                            <option value="public">Public (Visible to everyone in your college)</option>
                            <option value="private">Private (Visible only to members)</option>
                        </select>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </form>
                <div className="p-4 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
                    <div className="flex justify-end gap-2 w-full">
                        <button type="button" onClick={onClose} className="bg-slate-100 text-text-body px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold">
                            Cancel
                        </button>
                        <button type="submit" form="create-group-form" disabled={loading} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold">
                            {loading ? <Spinner size="sm" /> : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateGroupModal;
