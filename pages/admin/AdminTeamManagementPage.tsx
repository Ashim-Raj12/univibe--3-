import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { TeamMember } from '../../types';
import Spinner from '../../components/Spinner';

// Form Modal for Add/Edit
interface TeamMemberFormModalProps {
    member: TeamMember | null;
    onClose: () => void;
    onSuccess: () => void;
}

const TeamMemberFormModal: React.FC<TeamMemberFormModalProps> = ({ member, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: member?.name || '',
        role: member?.role || '',
        bio: member?.bio || '',
        linkedin_url: member?.linkedin_url || '',
        twitter_url: member?.twitter_url || '',
        github_url: member?.github_url || '',
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(member?.avatar_url || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        let avatarUrl = member?.avatar_url || null;

        try {
            // Upload avatar if a new one is selected
            if (avatarFile) {
                const filePath = `team-avatars/${Date.now()}_${avatarFile.name}`;
                const { data, error: uploadError } = await supabase.storage
                    .from('team-avatars')
                    .upload(filePath, avatarFile);
                if (uploadError) throw uploadError;
                
                const { data: { publicUrl } } = supabase.storage.from('team-avatars').getPublicUrl(data.path);
                avatarUrl = publicUrl;
                
                // If editing and an old avatar exists, delete it
                if (member?.avatar_url) {
                    const oldPathMatch = member.avatar_url.match(/team-avatars\/(.*)/);
                    if (oldPathMatch && oldPathMatch[1]) {
                        await supabase.storage.from('team-avatars').remove([oldPathMatch[1]]);
                    }
                }
            }

            const upsertData = { ...formData, avatar_url: avatarUrl };

            if (member) { // Update
                const { error: updateError } = await supabase
                    .from('team_members')
                    .update(upsertData)
                    .eq('id', member.id);
                if (updateError) throw updateError;
            } else { // Insert
                const { error: insertError } = await supabase
                    .from('team_members')
                    .insert(upsertData);
                if (insertError) throw insertError;
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
                    <h2 className="text-xl font-bold text-slate-800">{member ? 'Edit' : 'Add'} Team Member</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex flex-col items-center">
                        <img src={preview || `https://avatar.vercel.sh/placeholder.png?text=?`} alt="Avatar Preview" className="w-24 h-24 rounded-full object-cover mb-2 border"/>
                        <label className="cursor-pointer text-sm font-semibold text-primary hover:underline">
                            Upload Avatar
                            <input type="file" onChange={handleFileChange} accept="image/*" className="hidden"/>
                        </label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClasses} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                            <input type="text" name="role" value={formData.role} onChange={handleChange} className={inputClasses} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                        <textarea name="bio" value={formData.bio} onChange={handleChange} className={inputClasses} rows={3}></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn URL</label>
                        <input type="url" name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} className={inputClasses} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Twitter URL</label>
                        <input type="url" name="twitter_url" value={formData.twitter_url} onChange={handleChange} className={inputClasses} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">GitHub URL</label>
                        <input type="url" name="github_url" value={formData.github_url} onChange={handleChange} className={inputClasses} />
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="bg-slate-100 text-slate-800 px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold">Cancel</button>
                        <button type="submit" disabled={loading} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[100px] font-semibold">
                            {loading ? <Spinner size="sm" /> : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const AdminTeamManagementPage: React.FC = () => {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('team_members')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) {
            setError(error.message);
        } else {
            setMembers(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleOpenModal = (member: TeamMember | null = null) => {
        setEditingMember(member);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingMember(null);
    };

    const handleSuccess = () => {
        handleCloseModal();
        fetchMembers();
    };

    const handleDelete = async (member: TeamMember) => {
        if (!window.confirm(`Are you sure you want to delete ${member.name}?`)) return;

        try {
            // Delete avatar from storage first
            if (member.avatar_url) {
                const pathMatch = member.avatar_url.match(/team-avatars\/(.*)/);
                if (pathMatch && pathMatch[1]) {
                    const { error: storageError } = await supabase.storage.from('team-avatars').remove([pathMatch[1]]);
                    if (storageError) {
                         console.error("Could not delete old avatar, proceeding with DB delete:", storageError);
                    }
                }
            }
            
            const { error } = await supabase.from('team_members').delete().eq('id', member.id);
            if (error) throw error;
            
            fetchMembers();
        } catch(err: any) {
            alert(`Failed to delete member: ${err.message}`);
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Team Management</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-focus transition-colors font-semibold shadow-sm"
                >
                    Add Member
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> :
                 error ? <p className="text-center text-red-500 p-8">{error}</p> :
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-6 py-3">Member</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {members.map(member => (
                            <tr key={member.id}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={member.avatar_url || `https://avatar.vercel.sh/${member.name}.png`} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                                        <span className="font-medium">{member.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{member.role}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button
                                        onClick={() => handleOpenModal(member)}
                                        className="px-3 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                                    >
                                        Edit
                                    </button>
                                     <button
                                        onClick={() => handleDelete(member)}
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

            {isModalOpen && (
                <TeamMemberFormModal member={editingMember} onClose={handleCloseModal} onSuccess={handleSuccess} />
            )}
        </div>
    );
};

export default AdminTeamManagementPage;
