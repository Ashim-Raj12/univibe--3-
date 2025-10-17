import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Profile } from '../../types';
import Spinner from '../../components/Spinner';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import VerifiedBadge from '../../components/VerifiedBadge';

interface RemarkModalProps {
    user: Profile;
    onClose: () => void;
    onSuccess: () => void;
}

const RemarkModal: React.FC<RemarkModalProps> = ({ user, onClose, onSuccess }) => {
    const [remark, setRemark] = useState(user.profile_remark || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        const { error: rpcError } = await supabase.rpc('admin_set_user_remark', {
            target_user_id: user.id,
            remark_text: remark.trim() === '' ? null : remark.trim(),
        });
        
        if (rpcError) {
            setError(rpcError.message);
            setLoading(false);
        } else {
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Set Remark for {user.name}</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="remark-input" className="block text-sm font-medium text-slate-700 mb-1">
                            Profile Remark (e.g., Founder, Faculty)
                        </label>
                        <input
                            id="remark-input"
                            type="text"
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                         <p className="text-xs text-slate-500 mt-1">Leave blank to remove the remark.</p>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="bg-slate-100 text-slate-800 px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[90px] font-semibold">
                            {loading ? <Spinner size="sm" /> : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const AdminUserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'verified' | 'banned' | 'not_verified'>('all');
    const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);


    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

        if (debouncedSearch) {
            query = query.or(`name.ilike.%${debouncedSearch}%,username.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
        }
        
        switch (filter) {
            case 'verified':
                query = query.eq('is_verified', true);
                break;
            case 'banned':
                query = query.eq('is_banned', true);
                break;
            case 'not_verified':
                query = query.eq('is_verified', false).eq('is_banned', false);
                break;
        }

        const { data, error } = await query.limit(100);

        if (error) {
            setError(error.message);
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    }, [debouncedSearch, filter]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleToggleBan = async (userId: string, isCurrentlyBanned: boolean) => {
        const action = isCurrentlyBanned ? 'unban' : 'ban';
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

        const { error } = await supabase.rpc('toggle_user_ban', { target_user_id: userId });

        if (error) {
            alert(`Failed to ${action} user: ${error.message}`);
        } else {
            setUsers(prevUsers =>
                prevUsers.map(u => u.id === userId ? { ...u, is_banned: !isCurrentlyBanned } : u)
            );
        }
    };
    
    const openRemarkModal = (user: Profile) => {
        setSelectedUser(user);
        setIsRemarkModalOpen(true);
    };

    const closeRemarkModal = () => {
        setSelectedUser(null);
        setIsRemarkModalOpen(false);
    };

    const handleRemarkSuccess = () => {
        closeRemarkModal();
        fetchUsers();
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">User Management</h1>
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by name, username, or email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>

            <div className="mb-4">
                <div className="flex space-x-1 rounded-lg bg-slate-200 p-1">
                    {(['all', 'verified', 'not_verified', 'banned'] as const).map(tab => (
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
            
            <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> :
                 error ? <p className="text-center text-red-500 p-8">{error}</p> :
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">Joined</th>
                            <th className="px-6 py-3">College</th>
                            <th className="px-6 py-3">Remark</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 font-medium">
                                    <div className="flex items-center gap-3">
                                        <img src={user.avatar_url || `https://avatar.vercel.sh/${user.id}.png`} alt={user.name || ''} className="w-8 h-8 rounded-full object-cover" />
                                        <div>
                                            <div className="flex items-center gap-1">
                                                <Link to={`/profile/${user.id}`} className="hover:underline">{user.name}</Link>
                                                {user.is_verified && <VerifiedBadge />}
                                            </div>
                                            <p className="text-xs text-slate-500">@{user.username}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                <td className="px-6 py-4 text-slate-500" title={format(new Date(user.created_at), 'PPpp')}>
                                    {format(new Date(user.created_at), 'PP')}
                                </td>
                                <td className="px-6 py-4">{user.college}</td>
                                <td className="px-6 py-4 text-slate-600">{user.profile_remark || '-'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {user.is_verified && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">Verified</span>}
                                        {user.is_banned && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">Banned</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button
                                        onClick={() => openRemarkModal(user)}
                                        className="px-3 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200"
                                    >
                                        Set Remark
                                    </button>
                                    <button
                                        onClick={() => handleToggleBan(user.id, user.is_banned)}
                                        className={`px-3 py-1 rounded text-xs font-semibold ${user.is_banned ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                                    >
                                        {user.is_banned ? 'Unban' : 'Ban'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                }
            </div>
            {isRemarkModalOpen && selectedUser && (
                <RemarkModal user={selectedUser} onClose={closeRemarkModal} onSuccess={handleRemarkSuccess} />
            )}
        </div>
    );
};

export default AdminUserManagementPage;