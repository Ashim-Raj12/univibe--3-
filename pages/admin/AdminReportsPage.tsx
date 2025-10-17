import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Report, ReportWithReporter } from '../../types';
import Spinner from '../../components/Spinner';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const getEntityLink = (entityType: Report['entity_type'], entityId: string) => {
    switch (entityType) {
        case 'profile':
            return `/profile/${entityId}`;
        case 'post':
            return `/post/${entityId}`;
        case 'comment': // Comments don't have their own page, link to post
            // This is a simplification; a more robust solution might fetch the post_id
            return '#'; 
        case 'message': // Messages are private, no direct link for admin
            return '#';
        default:
            return '#';
    }
}

const AdminReportsPage: React.FC = () => {
    const [reports, setReports] = useState<ReportWithReporter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'pending' | 'resolved' | 'all'>('pending');

    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        let query = supabase
            .from('reports')
            .select('*, profiles:reporter_id(*)')
            .order('created_at', { ascending: false });

        if (filter !== 'all') {
            query = query.eq('status', filter);
        }

        const { data, error } = await query;
        if (error) {
            setError(error.message);
        } else {
            setReports(data as any);
        }
        setLoading(false);
    }, [filter]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);
    
    const handleUpdateStatus = async (reportId: number, status: Report['status']) => {
        const { error } = await supabase.from('reports').update({ status }).eq('id', reportId);
        if (error) {
            alert('Failed to update status: ' + error.message);
        } else {
            fetchReports();
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">User Reports</h1>
            
            <div className="mb-4">
                <div className="flex space-x-1 rounded-lg bg-slate-200 p-1">
                    {(['pending', 'resolved', 'all'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`w-full rounded-md py-2 text-sm font-medium transition-colors focus:outline-none ${
                                filter === tab ? 'bg-white text-primary shadow' : 'text-slate-600 hover:bg-white/50'
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> :
             error ? <p className="text-center text-red-500 p-8">{error}</p> :
             reports.length === 0 ? <p className="text-center text-gray-500 bg-white p-10 rounded-lg border">No reports found for this filter.</p> :
            <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-6 py-3">Reported Item</th>
                            <th className="px-6 py-3">Reason</th>
                            <th className="px-6 py-3">Reporter</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {reports.map(report => (
                            <tr key={report.id}>
                                <td className="px-6 py-4">
                                    <Link 
                                        to={getEntityLink(report.entity_type, report.entity_id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-semibold hover:underline capitalize"
                                    >
                                        {report.entity_type} <span className="text-slate-500">#{report.entity_id}</span>
                                    </Link>
                                </td>
                                <td className="px-6 py-4 max-w-sm">
                                    <p className="truncate" title={report.reason}>{report.reason}</p>
                                </td>
                                <td className="px-6 py-4">{report.profiles.name}</td>
                                <td className="px-6 py-4 text-slate-500" title={format(new Date(report.created_at), 'PPpp')}>
                                    {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                                </td>
                                <td className="px-6 py-4">{report.status}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {report.status === 'pending' && (
                                        <button onClick={() => handleUpdateStatus(report.id, 'resolved')} className="px-3 py-1 rounded text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200">
                                            Mark Resolved
                                        </button>
                                    )}
                                     {report.status === 'resolved' && (
                                        <button onClick={() => handleUpdateStatus(report.id, 'pending')} className="px-3 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                                            Re-open
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            }
        </div>
    );
};

export default AdminReportsPage;
