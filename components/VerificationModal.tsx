import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';

interface VerificationModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const VerificationModal: React.FC<VerificationModalProps> = ({ onClose, onSuccess }) => {
    const { user } = useAuth();
    const [idFile, setIdFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if(file.size > 5 * 1024 * 1024) { // 5MB limit
                setError("File is too large. Max size is 5MB.");
                return;
            }
            setError(null);
            setIdFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !idFile) return;

        setLoading(true);
        setError(null);

        try {
            // NOTE: Requires a private 'id-cards' bucket in Supabase storage.
            const filePath = `${user.id}/${Date.now()}_${idFile.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('id-cards')
                .upload(filePath, idFile);

            if (uploadError) throw uploadError;
            if (!uploadData?.path) throw new Error("ID card upload failed, please try again.");

            // Note: We don't get a public URL for private files. We store the path.
            const { error: insertError } = await supabase.from('verification_submissions').insert({
                user_id: user.id,
                id_card_url: uploadData.path,
            });

            if (insertError) throw insertError;
            
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
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-heading">Get Verified</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-heading">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm text-text-body">Upload a clear photo of your student ID. Your name and college must be visible. This image will be used for verification purposes only and will not be shared publicly.</p>
                    
                    <div>
                        <label htmlFor="id-card-upload" className="block text-sm font-medium text-text-body mb-2">Student ID Card</label>
                        <input id="id-card-upload" type="file" onChange={handleFileChange} accept="image/jpeg, image/png, image/webp" required className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary hover:file:bg-blue-100"/>
                    </div>

                    {preview && <img src={preview} alt="ID card preview" className="w-full h-auto max-h-60 object-contain rounded-md border bg-slate-50"/>}

                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="bg-slate-100 text-text-body px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading || !idFile} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold">
                            {loading ? <Spinner size="sm" /> : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VerificationModal;