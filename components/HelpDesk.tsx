import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Complaint, ComplaintWithUser } from '../types';
import Spinner from './Spinner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface HelpDeskProps {
    collegeName: string;
    isModerator?: boolean;
}

const complaintCategories = ['Academics', 'Hostel', 'Campus Facilities', 'Faculty', 'Other'];

const ComplaintStatusBadge: React.FC<{ status: Complaint['status'] }> = ({ status }) => {
    const styles = {
        submitted: 'bg-blue-100 text-blue-800',
        in_review: 'bg-yellow-100 text-yellow-800',
        resolved: 'bg-green-100 text-green-800',
    };
    const text = {
        submitted: 'Submitted',
        in_review: 'In Review',
        resolved: 'Resolved',
    }
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>;
};

const ModeratorComplaintCard: React.FC<{ complaint: ComplaintWithUser; onUpdate: () => void }> = ({ complaint, onUpdate }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [status, setStatus] = useState(complaint.status);

    const handleUpdateStatus = async (newStatus: Complaint['status']) => {
        setIsUpdating(true);
        const { error } = await supabase.from('complaints').update({ status: newStatus }).eq('id', complaint.id);
        if (error) {
            alert('Failed to update status: ' + error.message);
        } else {
            setStatus(newStatus);
            onUpdate();
        }
        setIsUpdating(false);
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-800 text-base">{complaint.title}</h3>
                <ComplaintStatusBadge status={status} />
            </div>
            <p className="text-xs text-slate-500">{complaint.category} &bull; {format(new Date(complaint.created_at), 'PPp')}</p>
            <p className="text-sm text-slate-600 my-3 whitespace-pre-wrap">{complaint.description}</p>
            <div className="flex items-center gap-2 text-sm pt-2 border-t border-slate-100">
                <img src={complaint.profiles.avatar_url || `https://avatar.vercel.sh/${complaint.profiles.id}.png`} alt={complaint.profiles.name} className="w-6 h-6 rounded-full" />
                <Link to={`/profile/${complaint.profiles.id}`} className="font-semibold hover:underline">
                    {complaint.profiles.name}
                </Link>
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-end gap-2">
                <span className="text-sm font-semibold mr-auto">Actions:</span>
                <button onClick={() => handleUpdateStatus('in_review')} disabled={isUpdating || status === 'in_review'} className="px-3 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-50">In Review</button>
                <button onClick={() => handleUpdateStatus('resolved')} disabled={isUpdating || status === 'resolved'} className="px-3 py-1 rounded text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50">Resolved</button>
            </div>
        </div>
    );
};


const ModeratorView: React.FC<{ collegeName: string }> = ({ collegeName }) => {
    const [complaints, setComplaints] = useState<ComplaintWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'submitted' | 'in_review' | 'resolved'>('submitted');

    const fetchAllComplaints = useCallback(async () => {
        setLoading(true);
        const { data, error: fetchError } = await supabase
            .from('complaints')
            .select('*, profiles:user_id(*)')
            .eq('college', collegeName)
            .order('created_at', { ascending: false });
        
        if (fetchError) setError(fetchError.message);
        else setComplaints(data as any);
        setLoading(false);
    }, [collegeName]);

    useEffect(() => {
        fetchAllComplaints();
    }, [fetchAllComplaints]);

    const filteredComplaints = complaints.filter(c => c.status === filter);

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-text-heading">Help Desk Submissions</h3>
            <div className="flex space-x-1 rounded-lg bg-slate-200 p-1">
                {(['submitted', 'in_review', 'resolved'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`w-full rounded-md py-2 text-sm font-medium transition-colors focus:outline-none ${filter === tab ? 'bg-white text-primary shadow' : 'text-slate-600 hover:bg-white/50'}`}
                    >
                        {tab.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                ))}
            </div>
            {loading ? <div className="flex justify-center p-8"><Spinner/></div> :
             error ? <p className="text-red-500 text-center">{error}</p> :
             filteredComplaints.length === 0 ? <p className="text-center text-text-muted p-6">No complaints with status "{filter}".</p> :
             <div className="space-y-4">
                {filteredComplaints.map(c => <ModeratorComplaintCard key={c.id} complaint={c} onUpdate={fetchAllComplaints} />)}
             </div>
            }
        </div>
    );
}

const HelpDesk: React.FC<HelpDeskProps> = ({ collegeName, isModerator }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(complaintCategories[0]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    
    const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchComplaints = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('complaints')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (data) setMyComplaints(data);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (!isModerator) {
            fetchComplaints();
        }
    }, [fetchComplaints, isModerator]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !title.trim() || !description.trim()) return;

        setSubmitting(true);
        setError(null);
        setSuccess(false);

        const { error: insertError } = await supabase.from('complaints').insert({
            user_id: user.id,
            college: collegeName,
            category,
            title,
            description,
        });

        if (insertError) {
            setError(insertError.message);
        } else {
            setSuccess(true);
            setTitle('');
            setDescription('');
            setCategory(complaintCategories[0]);
            fetchComplaints(); // Refresh the list
            setTimeout(() => setSuccess(false), 3000);
        }
        setSubmitting(false);
    };

    const inputClasses = "w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";

    if (isModerator) {
        return <ModeratorView collegeName={collegeName} />;
    }

    return (
        <div className="p-2 space-y-6">
            <div>
                <h3 className="text-xl font-bold text-text-heading">Raise an Issue</h3>
                <p className="text-sm text-text-muted mt-1">Submit a complaint or provide feedback. This will be reviewed by administrators.</p>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4 p-4 bg-slate-50 rounded-lg">
                    {success && <p className="text-green-600 font-semibold text-sm">Your submission has been received!</p>}
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Category</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClasses}>
                            {complaintCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Subject</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClasses} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Details</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClasses} rows={4} required></textarea>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="text-right">
                        <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold text-sm ml-auto">
                            {submitting ? <Spinner size="sm" /> : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
            <div>
                 <h3 className="text-xl font-bold text-text-heading">My Submissions</h3>
                 <div className="mt-4 space-y-3">
                    {loading ? <Spinner /> : myComplaints.length === 0 ? (
                        <p className="text-center text-text-muted text-sm py-4">You haven't submitted any issues yet.</p>
                    ) : (
                        myComplaints.map(c => (
                            <div key={c.id} className="bg-slate-50 p-3 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold text-text-heading">{c.title}</p>
                                    <ComplaintStatusBadge status={c.status} />
                                </div>
                                <p className="text-xs text-text-muted mt-1">{c.category} &bull; {format(new Date(c.created_at), 'PP')}</p>
                                <p className="text-sm text-text-body mt-2">{c.description}</p>
                            </div>
                        ))
                    )}
                 </div>
            </div>
        </div>
    );
};

export default HelpDesk;