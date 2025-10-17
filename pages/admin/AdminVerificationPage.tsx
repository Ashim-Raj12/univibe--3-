

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { VerificationSubmissionWithProfile, Profile } from '../../types';
import Spinner from '../../components/Spinner';
import VerificationSubmissionCard from '../../components/VerificationSubmissionCard';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import VerifiedBadge from '../../components/VerifiedBadge';

const AdminVerificationPage: React.FC = () => {
    const [submissions, setSubmissions] = useState<VerificationSubmissionWithProfile[]>([]);
    const [history, setHistory] = useState<VerificationSubmissionWithProfile[]>([]);
    const [verifiedUsers, setVerifiedUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'verified'>('queue');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const queuePromise = supabase
                .from('verification_submissions')
                .select('*, profiles:user_id(*)')
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            const historyPromise = supabase
                .from('verification_submissions')
                .select('*, profiles:user_id(*), reviewer:reviewer_id(id, name, avatar_url)')
                .neq('status', 'pending')
                .order('reviewed_at', { ascending: false })
                .limit(50);
            
            const verifiedPromise = supabase
                .from('profiles')
                .select('*')
                .eq('is_verified', true)
                .order('name', { ascending: true });
            
            const [
                { data: queueData, error: queueError }, 
                { data: historyData, error: historyError },
                { data: verifiedData, error: verifiedError }
            ] = await Promise.all([queuePromise, historyPromise, verifiedPromise]);

            if (queueError) throw queueError;
            if (historyError) throw historyError;
            if (verifiedError) throw verifiedError;
            
            setSubmissions(queueData as any);
            setHistory(historyData as any);
            setVerifiedUsers(verifiedData as any);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleReview = () => {
        // Refetch all data to update both queue and history
        fetchData();
    };
    
    const renderQueue = () => {
        if (submissions.length === 0) {
            return <p className="text-center text-gray-500 bg-white p-10 rounded-lg border">The verification queue is empty.</p>;
        }
        return (
            <div className="space-y-4">
                {submissions.map(submission => (
                    <VerificationSubmissionCard key={submission.id} submission={submission} onReviewed={handleReview} />
                ))}
            </div>
        );
    };

    const renderHistory = () => {
        if (history.length === 0) {
            return <p className="text-center text-gray-500 bg-white p-10 rounded-lg border">No review history found.</p>;
        }
        return (
            <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Reviewed At</th>
                            <th className="px-6 py-3">Reviewer</th>
                            <th className="px-6 py-3">Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {history.map(item => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 font-medium">{item.profiles.name}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{item.reviewed_at ? format(new Date(item.reviewed_at), 'PPp') : 'N/A'}</td>
                                <td className="px-6 py-4">
                                    {item.reviewer ? (
                                        <div className="flex items-center gap-2" title={item.reviewer.name ?? ''}>
                                            <img src={item.reviewer.avatar_url || `https://avatar.vercel.sh/${item.reviewer.id}.png`} alt={item.reviewer.name ?? ''} className="w-6 h-6 rounded-full" />
                                            <span className="text-slate-600 truncate">{item.reviewer.name?.split(' ')[0]}</span>
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{item.reviewer_notes || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderVerified = () => {
        if (verifiedUsers.length === 0) {
            return <p className="text-center text-gray-500 bg-white p-10 rounded-lg border">No verified users found.</p>;
        }
        return (
            <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">College</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {verifiedUsers.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 font-medium">
                                    <div className="flex items-center gap-3">
                                        <img src={user.avatar_url || `https://avatar.vercel.sh/${user.id}.png`} alt={user.name || ''} className="w-8 h-8 rounded-full object-cover" />
                                        <div>
                                            <div className="flex items-center gap-1">
                                                <Link to={`/profile/${user.id}`} className="hover:underline">{user.name}</Link>
                                                <VerifiedBadge />
                                            </div>
                                            <p className="text-xs text-slate-500">@{user.username}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">{user.email}</td>
                                <td className="px-6 py-4">{user.college}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Verification Management</h1>
            <div className="border-b border-slate-200 mb-4">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('queue')} className={`${activeTab === 'queue' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                        Queue <span className="ml-1 bg-primary text-white text-xs font-bold rounded-full px-2 py-0.5">{submissions.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                        History
                    </button>
                     <button onClick={() => setActiveTab('verified')} className={`${activeTab === 'verified' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                        Verified Users
                    </button>
                </nav>
            </div>
            
            {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> : 
             error ? <p className="text-center text-red-500 p-8">{error}</p> :
             activeTab === 'queue' ? renderQueue() : 
             activeTab === 'history' ? renderHistory() : 
             renderVerified()
            }
        </div>
    );
};

export default AdminVerificationPage;