import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { College } from '../../types';
import Spinner from '../../components/Spinner';

const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .replace(/\s+/g, ' ') // Collapse whitespace
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};


// Form Modal for Add/Edit
interface CollegeFormModalProps {
    college: College | null;
    onClose: () => void;
    onSuccess: () => void;
}

const CollegeFormModal: React.FC<CollegeFormModalProps> = ({ college, onClose, onSuccess }) => {
    const [name, setName] = useState(college?.name || '');
    const [domain, setDomain] = useState(college?.accepted_domain || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        const upsertData = {
            name: toTitleCase(name),
            accepted_domain: domain.trim() === '' ? null : domain.trim(),
        };

        try {
            if (college) { // Update
                const { error: updateError } = await supabase.from('colleges').update(upsertData).eq('id', college.id);
                if (updateError) throw updateError;
            } else { // Insert
                const { error: insertError } = await supabase.from('colleges').insert(upsertData);
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
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                 <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">{college ? 'Edit' : 'Add'} College</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">&times;</button>
                </div>
                 <form onSubmit={handleSubmit} className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">College Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClasses} required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Accepted Email Domain</label>
                        <input type="text" value={domain} onChange={e => setDomain(e.target.value)} className={inputClasses} placeholder="e.g., harvard.edu" />
                        <p className="text-xs text-slate-500 mt-1">Leave blank to allow any user to post/create events for this college.</p>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                     <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="bg-slate-100 text-slate-800 px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold">Cancel</button>
                        <button type="submit" disabled={loading} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[90px] font-semibold">
                            {loading ? <Spinner size="sm" /> : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const AdminCollegeManagementPage: React.FC = () => {
    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCollege, setEditingCollege] = useState<College | null>(null);

    const fetchColleges = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('colleges')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) {
            setError(error.message);
        } else {
            setColleges(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchColleges();
    }, [fetchColleges]);
    
    const handleOpenModal = (college: College | null = null) => {
        setEditingCollege(college);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCollege(null);
    };

    const handleSuccess = () => {
        handleCloseModal();
        fetchColleges();
    };


    const handleDeleteCollege = async (collegeId: number, collegeName: string) => {
        if (!window.confirm(`Are you sure you want to delete "${collegeName}"? This cannot be undone.`)) return;

        const { error } = await supabase.from('colleges').delete().eq('id', collegeId);

        if (error) {
            alert(`Failed to delete college: ${error.message}`);
        } else {
            fetchColleges(); // Refetch the list
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">College Management</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-focus transition-colors font-semibold shadow-sm"
                >
                    Add College
                </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
                {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> :
                 error ? <p className="text-center text-red-500 p-8">{error}</p> :
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-700">
                        <tr>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Accepted Domain</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {colleges.map(c => (
                            <tr key={c.id}>
                                <td className="px-6 py-4 font-medium text-slate-900">{c.name}</td>
                                <td className="px-6 py-4 font-mono text-xs">{c.accepted_domain || <span className="text-slate-400">Any</span>}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                     <button
                                        onClick={() => handleOpenModal(c)}
                                        className="px-3 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                                    >
                                        Edit
                                    </button>
                                     <button
                                        onClick={() => handleDeleteCollege(c.id, c.name)}
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
                <CollegeFormModal college={editingCollege} onClose={handleCloseModal} onSuccess={handleSuccess} />
            )}
        </div>
    );
};

export default AdminCollegeManagementPage;