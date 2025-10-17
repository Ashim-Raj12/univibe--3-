import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { CommunityMemberWithProfile } from '../types';
import Spinner from './Spinner';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import VerifiedBadge from './VerifiedBadge';

interface CommunityMembersModalProps {
    communityId: number;
    communityName: string;
    creatorId: string;
    onClose: () => void;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`${
            checked ? 'bg-primary' : 'bg-slate-300'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50`}
    >
        <span
            aria-hidden="true"
            className={`${
                checked ? 'translate-x-5' : 'translate-x-0'
            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
    </button>
);


const CommunityMembersModal: React.FC<CommunityMembersModalProps> = ({ communityId, communityName, creatorId, onClose }) => {
    const { user } = useAuth();
    const [members, setMembers] = useState<CommunityMemberWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const isCreator = user?.id === creatorId;

    useEffect(() => {
        const fetchMembers = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('community_members')
                .select('user_id, created_at, can_post, profiles:user_id(*)')
                .eq('community_id', communityId)
                .order('created_at', { ascending: true });
            
            if (error) {
                console.error("Error fetching community members:", error);
            } else if (data) {
                setMembers(data as any);
            }
            setLoading(false);
        };
        fetchMembers();
    }, [communityId]);

    const handlePermissionChange = async (memberId: string, canPost: boolean) => {
        // Optimistic update
        setMembers(prevMembers =>
            prevMembers.map(m =>
                m.user_id === memberId ? { ...m, can_post: canPost } : m
            )
        );

        const { error } = await supabase
            .from('community_members')
            .update({ can_post: canPost })
            .match({ community_id: communityId, user_id: memberId });

        if (error) {
            console.error("Error updating permission:", error);
            // Revert on error
             setMembers(prevMembers =>
                prevMembers.map(m =>
                    m.user_id === memberId ? { ...m, can_post: !canPost } : m
                )
            );
            alert("Failed to update permission. Please try again.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-background">
                    <h2 className="text-xl font-bold text-text-heading">Members of {communityName}</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-heading">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-4 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center p-8"><Spinner /></div>
                    ) : members.length === 0 ? (
                        <p className="text-center text-text-muted">No members yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {members.map(member => (
                                <div key={member.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 transition-colors">
                                    <Link to={`/profile/${member.profiles.id}`} onClick={onClose} className="flex items-center gap-3">
                                        <img src={member.profiles.avatar_url || `https://avatar.vercel.sh/${member.profiles.id}.png`} alt={member.profiles.name} className="w-10 h-10 rounded-full object-cover" />
                                        <div>
                                            <div className="flex items-center gap-1">
                                                <p className="font-semibold text-text-heading">{member.profiles.name}</p>
                                                {member.profiles.is_verified && <VerifiedBadge size="h-4 w-4" />}
                                            </div>
                                            <p className="text-sm text-text-muted">@{member.profiles.username}</p>
                                        </div>
                                    </Link>
                                    {isCreator && user?.id !== member.user_id && (
                                        <div className="text-right">
                                            <ToggleSwitch
                                                checked={member.can_post}
                                                onChange={(checked) => handlePermissionChange(member.user_id, checked)}
                                            />
                                            <label className="text-xs text-text-muted mt-1 block">Can Post</label>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommunityMembersModal;