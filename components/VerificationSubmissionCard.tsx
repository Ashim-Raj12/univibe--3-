import React, { useState, useEffect } from 'react';
import { VerificationSubmissionWithProfile } from '../types';
import { supabase } from '../services/supabase';
import Spinner from './Spinner';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import VerifiedBadge from './VerifiedBadge';

interface VerificationSubmissionCardProps {
    submission: VerificationSubmissionWithProfile;
    onReviewed: () => void;
}

const VerificationSubmissionCard: React.FC<VerificationSubmissionCardProps> = ({ submission, onReviewed }) => {
    const { user } = useAuth();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSignedUrl = async () => {
            setImageLoading(true);
            const { data, error } = await supabase.storage
                .from('id-cards')
                .createSignedUrl(submission.id_card_url, 3600); // URL valid for 1 hour

            if (error) {
                console.error("Error creating signed URL:", error);
            } else {
                setImageUrl(data.signedUrl);
            }
            setImageLoading(false);
        };
        fetchSignedUrl();
    }, [submission.id_card_url]);

    const handleApprove = async () => {
        if (!user || !window.confirm(`Are you sure you want to verify ${submission.profiles.name}?`)) return;
        setIsProcessing(true);
        setActionError(null);

        try {
            const { error } = await supabase.rpc('approve_verification', {
                p_submission_id: submission.id
            });
            if (error) throw error;
            onReviewed();
        } catch (error: any) {
            console.error("Verification approval failed:", error);
            setActionError("A database error occurred during approval. Please check the console and contact support.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!user || !rejectionReason.trim()) {
            setActionError("Please provide a reason for rejection.");
            return;
        }
        setIsProcessing(true);
        setActionError(null);
        
        try {
            const { error } = await supabase.rpc('reject_verification', {
                p_submission_id: submission.id,
                rejection_reason: rejectionReason,
            });
            if (error) throw error;
            onReviewed();
        } catch (error: any) {
            console.error("Verification rejection failed:", error);
            setActionError("A database error occurred during rejection. Please check the console and contact support.");
        } finally {
            setIsProcessing(false);
            setIsRejecting(false);
        }
    };

    return (
        <div className="bg-card p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="grid md:grid-cols-3 gap-4">
                {/* User Info */}
                <div className="md:col-span-1">
                    <h3 className="font-bold text-lg text-text-heading">User Details</h3>
                    <div className="flex items-center gap-3 mt-2">
                         <img src={submission.profiles.avatar_url || `https://avatar.vercel.sh/${submission.profiles.id}.png`} alt={submission.profiles.name} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                             <div className="flex items-center gap-1">
                                <Link to={`/profile/${submission.profiles.id}`} className="font-semibold text-text-heading hover:underline" target="_blank">{submission.profiles.name}</Link>
                                {submission.profiles.is_verified && <VerifiedBadge />}
                            </div>
                            <p className="text-sm text-text-muted">@{submission.profiles.username}</p>
                        </div>
                    </div>
                    <p className="text-sm mt-2"><strong>College:</strong> {submission.profiles.college}</p>
                    <p className="text-sm"><strong>Submitted:</strong> {format(new Date(submission.created_at), 'PPp')}</p>
                </div>

                {/* ID Card Image */}
                <div className="md:col-span-1 flex flex-col items-center justify-center">
                     <h3 className="font-bold text-lg text-text-heading mb-2">Student ID</h3>
                    {imageLoading ? <Spinner /> : (
                        <a href={imageUrl || '#'} target="_blank" rel="noopener noreferrer">
                            <img src={imageUrl || ''} alt="Student ID" className="max-w-full h-auto max-h-48 rounded-md border shadow-sm object-contain" />
                        </a>
                    )}
                </div>

                {/* Actions */}
                <div className="md:col-span-1 flex flex-col items-center justify-center gap-2">
                    {actionError && <p className="text-red-500 text-sm w-full text-center mb-2">{actionError}</p>}
                    {isRejecting ? (
                        <div className="w-full">
                            <textarea
                                placeholder="Reason for rejection (e.g., blurry image, not a valid ID)..."
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-md text-sm"
                                rows={2}
                            />
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => setIsRejecting(false)} className="bg-slate-200 text-text-body px-4 py-2 rounded-lg text-sm font-semibold flex-1">Cancel</button>
                                <button onClick={handleReject} disabled={isProcessing} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex-1 disabled:opacity-50">
                                    {isProcessing ? <Spinner size="sm"/> : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    ) : (
                         <>
                            <button onClick={handleApprove} disabled={isProcessing} className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-semibold disabled:opacity-50">
                                {isProcessing ? <Spinner size="sm"/> : 'Approve'}
                            </button>
                             <button onClick={() => setIsRejecting(true)} disabled={isProcessing} className="w-full bg-slate-200 text-text-body px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors font-semibold disabled:opacity-50">
                                Reject
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerificationSubmissionCard;