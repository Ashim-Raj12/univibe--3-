import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Community } from '../../types';
import Spinner from '../../components/Spinner';
import AdminCreateCommunityForm from '../../components/AdminCreateCommunityForm';
import { Link } from 'react-router-dom';

const AdminCommunityManagementPage: React.FC = () => {
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCommunities = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('communities')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            setError(error.message);
        } else {
            setCommunities(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCommunities();
    }, [fetchCommunities]);

    const handleDelete = async (communityId: number, communityName: string) => {
        if (!window.confirm(`Are you sure you want to delete the community "${communityName}"? This action is permanent and will delete all associated posts.`)) return;

        const { error } = await supabase.rpc('admin_delete_community', { community_id_to_delete: communityId });

        if (error) {
            alert(`Failed to delete community: ${error.message}`);
        } else {
            fetchCommunities();
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Community Management</h1>
            <div className="grid md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-1">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Create New Community</h3>
                    <AdminCreateCommunityForm onSuccess={fetchCommunities} />
                </div>
                <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Existing Communities</h3>
                    <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                        {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> :
                         error ? <p className="text-center text-red-500 p-8">{error}</p> :
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">College</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {communities.map(c => (
                                    <tr key={c.id}>
                                        <td className="px-6 py-4 font-medium"><Link to={`/community/${c.id}`} className="hover:underline">{c.name}</Link></td>
                                        <td className="px-6 py-4">{c.college}</td>
                                        <td className="px-6 py-4">
                                            {c.is_verified && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">Verified</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                             <button
                                                onClick={() => handleDelete(c.id, c.name)}
                                                className="px-3 py-1 rounded text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminCommunityManagementPage;