import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';

interface PostAssignmentModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const PostAssignmentModal: React.FC<PostAssignmentModalProps> = ({ onClose, onSuccess }) => {
    const { user, profile } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
                setError('File size cannot exceed 10MB.');
                return;
            }
            setError(null);
            setFile(selectedFile);
        }
    };

    const removeFile = () => {
        setFile(null);
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !profile || !title.trim() || !description.trim()) return;

        setLoading(true);
        setError(null);

        try {
            let fileUrl: string | null = null;
            let fileName: string | null = null;

            if (file) {
                const filePath = `assignments/${user.id}/${Date.now()}_${file.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('community-files') // Re-using bucket for general files
                    .upload(filePath, file);

                if (uploadError) throw uploadError;
                
                const { data: { publicUrl } } = supabase.storage.from('community-files').getPublicUrl(uploadData.path);
                fileUrl = publicUrl;
                fileName = file.name;
            }

            const { error: insertError } = await supabase.from('assignments').insert({
                title,
                description,
                price: parseFloat(price) || 0,
                due_date: dueDate || null,
                poster_id: user.id,
                college: profile.college,
                file_url: fileUrl,
                file_name: fileName,
            });

            if (insertError) throw insertError;

            onSuccess();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300";

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="bg-background w-full h-full flex flex-col sm:h-auto sm:max-h-[90vh] sm:rounded-2xl shadow-xl sm:max-w-lg animate-fade-in-up sm:animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-text-heading">Post an Assignment</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-heading">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form id="assignment-form" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-2">Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClasses} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-2">Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClasses} rows={4} required></textarea>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-body mb-2">Pay (₹)</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-text-muted">₹</span>
                                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputClasses} pl-8`} placeholder="1500.00" step="0.01" min="0" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-body mb-2">Due Date</label>
                            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClasses} min={new Date().toISOString().split('T')[0]} />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-2">Attachment (Optional)</label>
                        <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl">
                            <div className="space-y-1 text-center">
                                <svg className="mx-auto h-12 w-12 text-text-muted" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {file ? (
                                    <div className="flex items-center gap-2 text-sm text-text-body">
                                        <p className="font-semibold">{file.name}</p>
                                        <button type="button" onClick={removeFile} className="text-red-500 hover:text-red-700 font-bold" title="Remove file">&times;</button>
                                    </div>
                                ) : (
                                    <div className="flex text-sm text-text-body">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-primary hover:text-primary-focus focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                                            <span>Upload a file</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar,.txt,image/*" />
                                        </label>
                                    </div>
                                )}
                                <p className="text-xs text-text-muted">PDF, DOC, PPT, ZIP, Image up to 10MB</p>
                            </div>
                        </div>
                    </div>
                    
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </form>

                <div className="p-4 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0">
                    <button type="button" onClick={onClose} className="bg-slate-100 text-text-body px-6 py-2.5 rounded-xl hover:bg-slate-200 transition font-semibold">
                        Cancel
                    </button>
                    <button type="submit" form="assignment-form" disabled={loading} className="bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5 active:scale-95">
                        {loading ? <Spinner size="sm" /> : 'Post'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostAssignmentModal;