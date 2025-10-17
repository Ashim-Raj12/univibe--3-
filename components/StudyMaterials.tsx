

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { CommunityFileWithUploader } from '../types';
import Spinner from './Spinner';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';

const GenericFileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
);
const ImageFileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);
const PdfFileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A1 1 0 0111 2.586L15.414 7A1 1 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);

const FileIcon: React.FC<{ fileType: string }> = ({ fileType }) => {
    if (fileType.startsWith('image/')) return <ImageFileIcon />;
    if (fileType === 'application/pdf') return <PdfFileIcon />;
    return <GenericFileIcon />;
};

const FileUploadForm: React.FC<{ communityId: number; onUploadSuccess: () => void; }> = ({ communityId, onUploadSuccess }) => {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !user) return;

        setUploading(true);
        setError(null);

        try {
            const filePath = `${communityId}/${user.id}/${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('community-files') // NOTE: Bucket 'community-files' must be created in Supabase.
                .upload(filePath, file);

            if (uploadError) throw uploadError;
            if (!uploadData?.path) throw new Error("File upload failed, please try again.");

            const { data: { publicUrl } } = supabase.storage.from('community-files').getPublicUrl(uploadData.path);

            const { error: insertError } = await supabase.from('community_files').insert({
                community_id: communityId,
                user_id: user.id,
                file_name: file.name,
                file_url: publicUrl,
                file_type: file.type || 'application/octet-stream',
                description,
            });

            if (insertError) throw insertError;
            
            setFile(null);
            setDescription('');
            const fileInput = document.getElementById('community-file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = "";
            
            onUploadSuccess();

        } catch (err: any) {
            setError(err.message);
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-card p-5 rounded-2xl shadow-soft border border-slate-200/50">
            <h2 className="text-xl font-bold text-text-heading mb-4">Share Study Materials</h2>
            <form onSubmit={handleUpload} className="space-y-4">
                <div>
                    <label htmlFor="community-file-upload" className="block text-sm font-medium text-text-body mb-2">File</label>
                    <input id="community-file-upload" type="file" onChange={handleFileChange} required className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary hover:file:bg-blue-100"/>
                </div>
                <div>
                    <label htmlFor="file-description" className="block text-sm font-medium text-text-body mb-2">Description (Optional)</label>
                    <textarea id="file-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Midterm Study Guide for CS101" className="w-full p-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300" rows={2}></textarea>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="text-right">
                    <button type="submit" disabled={uploading || !file} className="bg-primary text-white px-6 py-2 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:opacity-50 flex items-center justify-center min-w-[120px] font-semibold ml-auto shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5">
                        {uploading ? <Spinner size="sm" /> : 'Upload'}
                    </button>
                </div>
            </form>
        </div>
    );
};


const StudyMaterials: React.FC<{ communityId: number; isMember: boolean; }> = ({ communityId, isMember }) => {
    const { user } = useAuth();
    const [files, setFiles] = useState<CommunityFileWithUploader[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFiles = useCallback(async () => {
        // Don't set loading to true on refetch
        const { data, error } = await supabase
            .from('community_files')
            .select('*, profiles(*)')
            .eq('community_id', communityId)
            .order('created_at', { ascending: false });

        if (error) {
            setError(error.message);
        } else {
            setFiles(data as any);
        }
        setLoading(false);
    }, [communityId]);

    useEffect(() => {
        fetchFiles();
        
        const channel = supabase
            .channel(`community-files-${communityId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'community_files', filter: `community_id=eq.${communityId}` },
                () => fetchFiles()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [communityId, fetchFiles]);
    
    const handleDelete = async (fileId: number, fileUrl: string) => {
        if (!window.confirm("Are you sure you want to delete this file?")) return;
        
        try {
            const path = new URL(fileUrl).pathname.split('/community-files/')[1];
            if (path) {
                const { error: storageError } = await supabase.storage.from('community-files').remove([path]);
                if (storageError) throw storageError;
            }
            
            const { error: dbError } = await supabase.from('community_files').delete().eq('id', fileId);
            if (dbError) throw dbError;
            
        } catch(err: any) {
            console.error("Error deleting file:", err);
            alert("Failed to delete file.");
        }
    };

    return (
        <div className="space-y-6">
            {isMember && <FileUploadForm communityId={communityId} onUploadSuccess={fetchFiles} />}
            
            {loading && <div className="flex justify-center p-8"><Spinner size="lg" /></div>}
            {error && <p className="text-center text-red-500">{error}</p>}
            
            {!loading && files.length === 0 && (
                <div className="text-center text-gray-500 bg-card p-10 rounded-2xl border border-slate-200/50">
                    No study materials have been shared yet.
                    {isMember && " Be the first!"}
                </div>
            )}
            
            {!loading && files.length > 0 && (
                <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50 divide-y divide-slate-100">
                    {files.map(file => (
                        <div key={file.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors duration-200">
                            <div className="text-text-muted flex-shrink-0">
                                <FileIcon fileType={file.file_type} />
                            </div>
                            <div className="flex-grow overflow-hidden">
                                <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-heading hover:underline truncate block">{file.file_name}</a>
                                {file.description && <p className="text-sm text-text-body">{file.description}</p>}
                                <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                                    Uploaded by
                                    <Link to={`/profile/${file.profiles.id}`} className="font-semibold hover:underline inline-flex items-center gap-1">
                                        {file.profiles.name}
                                        {file.profiles.is_verified && <VerifiedBadge size="h-3 w-3" />}
                                    </Link> 
                                    <span>{formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                 <a href={file.file_url} target="_blank" rel="noopener noreferrer" download={file.file_name} className="p-2 text-text-muted hover:text-primary rounded-full transition-colors" aria-label="Download file">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </a>
                                {user?.id === file.user_id && (
                                    <button onClick={() => handleDelete(file.id, file.file_url)} className="p-2 text-text-muted hover:text-red-500 rounded-full transition-colors" aria-label="Delete file">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudyMaterials;