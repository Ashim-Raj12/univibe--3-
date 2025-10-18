import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { StudyGroupWithMemberCount } from '../types';
import Spinner from './Spinner';
import { Link } from 'react-router-dom';
import CreateGroupModal from './CreateGroupModal';

const GroupCard: React.FC<{ group: StudyGroupWithMemberCount }> = ({ group }) => (
    <Link to={`/group/${group.id}`} className="block p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all duration-300 transform hover:scale-[1.02]">
        <div className="flex justify-between items-start">
            <div>
                <h4 className="font-bold text-text-heading">{group.name}</h4>
                <p className="text-xs text-text-muted mt-1">{group.college}</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${group.type === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                {group.type}
            </span>
        </div>
        <p className="text-sm text-text-body mt-2 h-10 overflow-hidden">{group.description}</p>
        <p className="text-xs text-text-muted font-semibold mt-2">{group.study_group_members[0]?.count || 0} members</p>
    </Link>
);


const StudyGroupsTab: React.FC = () => {
    const { user, profile } = useAuth();
    const [groups, setGroups] = useState<StudyGroupWithMemberCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGroups = useCallback(async () => {
        if (!user || !profile?.college) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        try {
            // 1. Fetch public groups in user's college
            const publicGroupsPromise = supabase
                .from('study_groups')
                .select('*, study_group_members(count)')
                .eq('type', 'public')
                .eq('college', profile.college);

            // 2. Fetch private groups user is a member of
            const { data: memberGroupsData, error: memberGroupsError } = await supabase
                .from('study_group_members')
                .select('group_id')
                .eq('user_id', user.id);
            
            if (memberGroupsError) throw memberGroupsError;
            
            const memberGroupIds = memberGroupsData.map(m => m.group_id);
            let privateGroupsPromise;
            if (memberGroupIds.length > 0) {
                privateGroupsPromise = supabase
                    .from('study_groups')
                    .select('*, study_group_members(count)')
                    .eq('type', 'private')
                    .in('id', memberGroupIds);
            } else {
                privateGroupsPromise = Promise.resolve({ data: [], error: null });
            }

            const [{ data: publicGroups, error: publicError }, { data: privateGroups, error: privateError }] = await Promise.all([publicGroupsPromise, privateGroupsPromise]);

            if (publicError) throw publicError;
            if (privateError) throw privateError;

            // 3. Combine and de-duplicate
            const allGroups = [...(publicGroups || []), ...(privateGroups || [])];
            const uniqueGroups = Array.from(new Map(allGroups.map(item => [item.id, item])).values())
                                    .sort((a, b) => a.name.localeCompare(b.name));

            setGroups(uniqueGroups);

        } catch (e: any) {
            console.error("Error fetching study groups:", e);
            setError(`Failed to fetch study groups. Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [user, profile]);


    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    return (
        <div className="space-y-6 p-2">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-text-heading">My Study Groups</h2>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-focus transition-colors font-semibold shadow-soft text-sm"
                >
                    Create Group
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
            ) : error ? (
                 <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-bold">Error Loading Groups</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            ) : groups.length === 0 ? (
                <div className="text-center text-gray-500 py-10 bg-slate-50 rounded-xl">
                    You haven't joined any study groups yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map(group => <GroupCard key={group.id} group={group} />)}
                </div>
            )}

            {isCreateModalOpen && profile && profile.college && (
                <CreateGroupModal
                    collegeName={profile.college}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        fetchGroups();
                    }}
                />
            )}
        </div>
    );
};

export default StudyGroupsTab;