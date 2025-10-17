import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Community } from '../types';
import Spinner from './Spinner';

interface VerifyCommunityModalProps {
    community: Community;
    onClose: () => void;
    onSuccess: () => void;
}

const VerifyCommunityModal: React.FC<VerifyCommunityModalProps> = ({ community, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleVerify = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const { error: updateError } = await supabase
                .from('communities')
                .update({ is_verified: true })
                .eq('id', community.id);

            if (updateError) throw updateError;
            
            onSuccess();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-text-heading">Verify Community</h2>
                </div>
                <div className="p-6">
                    <p className="text-text-body">
                        Are you sure you want to verify the community "<strong>{community.name}</strong>"?
                        This action cannot be undone.
                    </p>
                    {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                </div>
                 <div className="p-4 bg-slate-50 rounded-b-lg flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="bg-slate-200 text-text-body px-6 py-2 rounded-lg hover:bg-slate-300 transition font-semibold">
                        Cancel
                    </button>
                    <button onClick={handleVerify} disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[100px] font-semibold">
                        {loading ? <Spinner size="sm" /> : 'Verify'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerifyCommunityModal;
