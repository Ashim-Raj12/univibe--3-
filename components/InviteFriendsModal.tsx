import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { StudyGroup, Profile } from '../types';
import Spinner from './Spinner';
import { useAuth } from '../hooks/useAuth';

interface InviteFriendsModalProps {
    group: StudyGroup;
    members: Profile[];
    onClose: () => void;
}

type FriendWithStatus = {
    profile: Profile;
    status: 'none' | 'invited' | 'member';
}

const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({ group, members, onClose }) => {
    const { user } = useAuth();
    const [friends, setFriends] = useState<FriendWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const memberIds = new Set(members.map(m => m.id));

    const fetchFriends = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            // Fetch people the current user is following. This is a more direct definition of "friends" to invite.
            const { data: followingData, error: followingError } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', user.id);

            if (followingError) throw followingError;

            if (!followingData || followingData.length === 0) {
                setFriends([]);
                setLoading(false);
                return;
            }

            const friendIds = followingData.map(f => f.following_id);

            // Fetch profiles and existing invite statuses for these friends sequentially.
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .in('id', friendIds);
            if (profileError) throw profileError;

            const { data: invites, error: inviteError } = await supabase
                .from('study_group_invites')
                .select('invitee_id')
                .eq('group_id', group.id)
                .eq('status', 'pending')
                .in('invitee_id', friendIds);
            if (inviteError) throw inviteError;
            
            if (profiles) {
                const invitedIds = new Set((invites || []).map(i => i.invitee_id));
                const friendsWithStatus = profiles.map(p => ({
                    profile: p,
                    status: memberIds.has(p.id) ? 'member' : invitedIds.has(p.id) ? 'invited' : 'none'
                } as FriendWithStatus));
                setFriends(friendsWithStatus);
            } else {
                setFriends([]);
            }

        } catch (e: any) {
            console.error("Error fetching friends to invite:", e);
            setError("Could not load your friends list.");
            setFriends([]);
        } finally {
            setLoading(false);
        }
    }, [user, group.id, memberIds]);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    const handleInvite = async (friend: FriendWithStatus) => {
        if (!user) return;
        setInviting(prev => new Set(prev).add(friend.profile.id));

        const { data: invite, error: inviteError } = await supabase.from('study_group_invites')
            .insert({
                group_id: group.id,
                inviter_id: user.id,
                invitee_id: friend.profile.id,
            }).select().single();

        if (inviteError) {
            setError('Failed to send invite. They may have already been invited.');
        } else {
             await supabase.from('notifications').insert({
                user_id: friend.profile.id,
                actor_id: user.id,
                type: 'group_invite',
                entity_id: String(invite.id),
                metadata: { group_name: group.name }
            });
            setFriends(prev => prev.map(f => f.profile.id === friend.profile.id ? { ...f, status: 'invited' } : f));
        }
        setInviting(prev => {
            const newSet = new Set(prev);
            newSet.delete(friend.profile.id);
            return newSet;
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold">Invite Friends to {group.name}</h2>
                </div>
                <div className="p-4 overflow-y-auto">
                    {loading ? <div className="flex justify-center p-8"><Spinner /></div> :
                     friends.length === 0 ? <p className="text-center text-text-muted p-4">No friends available to invite. You can invite people you follow.</p> :
                     <div className="space-y-2">
                        {friends.map(friend => (
                            <div key={friend.profile.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-100">
                                <div className="flex items-center gap-2">
                                    <img src={friend.profile.avatar_url || `https://avatar.vercel.sh/${friend.profile.id}.png`} alt={friend.profile.name || 'Friend'} className="w-8 h-8 rounded-full object-cover" />
                                    <span>{friend.profile.name}</span>
                                </div>
                                <button
                                    onClick={() => handleInvite(friend)}
                                    disabled={friend.status !== 'none' || inviting.has(friend.profile.id)}
                                    className="text-sm font-semibold px-3 py-1 rounded-md disabled:opacity-70 disabled:cursor-not-allowed transition-colors
                                        ${friend.status === 'none' ? 'bg-primary text-white hover:bg-primary-focus' : 'bg-slate-200 text-text-body'}"
                                >
                                    {inviting.has(friend.profile.id) ? <Spinner size="sm"/> :
                                     friend.status === 'invited' ? 'Invited' :
                                     friend.status === 'member' ? 'Member' : 'Invite'}
                                </button>
                            </div>
                        ))}
                     </div>
                    }
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                 <div className="p-4 border-t text-right">
                    <button onClick={onClose} className="bg-slate-200 px-4 py-2 rounded-lg font-semibold">Done</button>
                </div>
            </div>
        </div>
    );
};

export default InviteFriendsModal;