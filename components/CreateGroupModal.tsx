import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

    useEffect(() => {
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

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

    const modalContent = (
        <div 
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4" 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            <div 
                className="absolute inset-0 bg-black/60" 
                onClick={onClose}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <div 
                className="relative bg-white w-full max-w-lg rounded-lg shadow-2xl z-10" 
                onClick={e => e.stopPropagation()}
                style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-heading">Create a Study Group</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-heading">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto" id="create-group-form">
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Group Name</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            className={inputClasses} 
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Description</label>
                        <textarea 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                            className={inputClasses} 
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Group Type</label>
                        <select 
                            value={type} 
                            onChange={e => setType(e.target.value as 'public' | 'private')} 
                            className={inputClasses}
                        >
                            <option value="public">Public (Visible to everyone in your college)</option>
                            <option value="private">Private (Visible only to members)</option>
                        </select>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </form>
                <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="bg-slate-100 text-text-body px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        form="create-group-form" 
                        disabled={loading} 
                        className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold"
                    >
                        {loading ? <Spinner size="sm" /> : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default CreateGroupModal;