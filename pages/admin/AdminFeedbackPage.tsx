import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { FeedbackWithUser } from '../../types';
import Spinner from '../../components/Spinner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import VerifiedBadge from '../../components/VerifiedBadge';

const FeedbackStatusBadge: React.FC<{ status: FeedbackWithUser['status'] }> = ({ status }) => {
    const styles = {
        submitted: 'bg-blue-100 text-blue-800',
        in_review: 'bg-yellow-100 text-yellow-800',
        resolved: 'bg-green-100 text-green-800',
    };
    const text = {
        submitted: 'Submitted',
        in_review: 'In Review',
        resolved: 'Resolved',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>;
};

const FeedbackCard: React.FC<{ item: FeedbackWithUser; onUpdate: () => void }> = ({ item, onUpdate }) => {
    const { user: adminUser } = useAuth();
    const [isReplying, setIsReplying] = useState(false);
    const [reply, setReply] = useState(item.admin_reply || '');
    const [status, setStatus] = useState(item.status);
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        if (!adminUser) return;
        setLoading(true);
        const { error } = await supabase
            .from('feedback')
            .update({
                admin_reply: reply.trim() || null,
                status,
                replied_by: reply.trim() ? adminUser.id : null,
                replied_at: reply.trim() ? new Date().toISOString() : null,
            })
            .eq('id', item.id);

        if (error) {
            alert('Error updating feedback: ' + error.message);
        } else {
            setIsReplying(false);
            onUpdate();
        }
        setLoading(false);
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-slate-800">{item.title}</h3>
                    <p className="text-xs text-slate-500">{item.category} &bull; {format(new Date(item.created_at), 'PPp')}</p>
                </div>
                <FeedbackStatusBadge status={item.status} />
            </div>
            <p className="text-sm text-slate-600 my-3 whitespace-pre-wrap">{item.description}</p>
            <div className="flex items-center gap-2 text-sm">
                <img src={item.profiles.avatar_url || `https://avatar.vercel.sh/${item.profiles.id}.png`} alt={item.profiles.name} className="w-6 h-6 rounded-full" />
                <Link to={`/profile/${item.profiles.id}`} className="font-semibold hover:underline inline-flex items-center gap-1">
                    {item.profiles.name}
                    {item.profiles.is_verified && <VerifiedBadge size="h-4 w-4" />}
                </Link>
            </div>

            {isReplying ? (
                <div className="mt-4 pt-4 border-t space-y-3">
                    <div>
                        <label className="text-xs font-semibold">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value as FeedbackWithUser['status'])} className="w-full mt-1 p-2 border rounded-md text-sm">
                            <option value="submitted">Submitted</option>
                            <option value="in_review">In Review</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold">Admin Reply</label>
                        <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} className="w-full mt-1 p-2 border rounded-md text-sm" placeholder="Write a reply..."></textarea>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsReplying(false)} className="px-4 py-1.5 rounded text-sm font-semibold bg-slate-100 hover:bg-slate-200">Cancel</button>
                        <button onClick={handleUpdate} disabled={loading} className="px-4 py-1.5 rounded text-sm font-semibold bg-primary text-white hover:bg-primary-focus disabled:opacity-50">
                            {loading ? <Spinner size="sm"/> : 'Save'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mt-4 pt-4 border-t">
                    {item.admin_reply ? (
                        <div className="bg-slate-50 p-3 rounded-lg">
                             <p className="font-semibold text-sm text-primary">Admin Reply</p>
                             <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{item.admin_reply}</p>
                        </div>
                    ) : null}
                    <div className="text-right mt-2">
                        <button onClick={() => setIsReplying(true)} className="px-4 py-1.5 rounded text-sm font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200">
                            {item.admin_reply ? 'Edit Reply' : 'Reply / Update Status'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const AdminFeedbackPage: React.FC = () => {
    const [feedback, setFeedback] = useState<FeedbackWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'submitted' | 'in_review' | 'resolved' | 'all'>('submitted');

    const fetchFeedback = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        let query = supabase
            .from('feedback')
            .select('*, profiles:user_id(*)')
            .order('created_at', { ascending: false });

        if (filter !== 'all') {
            query = query.eq('status', filter);
        }

        const { data, error } = await query;
        if (error) {
            setError(error.message);
        } else {
            setFeedback(data as any);
        }
        setLoading(false);
    }, [filter]);

    useEffect(() => {
        fetchFeedback();
    }, [fetchFeedback]);

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">User Feedback</h1>
            
            <div className="mb-4">
                <div className="flex space-x-1 rounded-lg bg-slate-200 p-1">
                    {(['submitted', 'in_review', 'resolved', 'all'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`w-full rounded-md py-2 text-sm font-medium transition-colors focus:outline-none ${
                                filter === tab ? 'bg-white text-primary shadow' : 'text-slate-600 hover:bg-white/50'
                            }`}
                        >
                            {tab.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> :
             error ? <p className="text-center text-red-500 p-8">{error}</p> :
             feedback.length === 0 ? <p className="text-center text-gray-500 bg-white p-10 rounded-lg border">No feedback found for this filter.</p> :
             <div className="space-y-4">
                 {feedback.map(item => (
                    <FeedbackCard key={item.id} item={item} onUpdate={fetchFeedback} />
                 ))}
             </div>
            }
        </div>
    );
};

export default AdminFeedbackPage;