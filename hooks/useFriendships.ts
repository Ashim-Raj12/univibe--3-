import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { Follow } from '../types';
import { FriendshipStatus } from '../components/UserCard';

export const useFriendships = (profileIds: string[]) => {
    const { user } = useAuth();
    const [follows, setFollows] = useState<Follow[]>([]);
    const [friendshipStatuses, setFriendshipStatuses] = useState<Map<string, FriendshipStatus>>(new Map());
    const [loading, setLoading] = useState(true);

    const getStatus = useCallback((profileId: string, currentFollows: Follow[]): FriendshipStatus => {
        if (!user) return 'not_friends';
        const isFollowing = currentFollows.some(f => f.follower_id === user.id && f.following_id === profileId);
        return isFollowing ? 'friends' : 'not_friends';
    }, [user]);

    const fetchFollows = useCallback(async () => {
        if (!user || profileIds.length === 0) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const { data, error } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', user.id)
            .in('following_id', profileIds);

        if (error) {
            console.error("Error fetching follows:", error);
        } else if (data) {
            setFollows(data);
            const statusMap = new Map<string, FriendshipStatus>();
            profileIds.forEach(id => {
                statusMap.set(id, getStatus(id, data));
            });
            setFriendshipStatuses(statusMap);
        }
        setLoading(false);
    }, [user, profileIds, getStatus]);

    useEffect(() => {
        fetchFollows();
    }, [fetchFollows]);

    const handleFriendshipAction = async (
        profileId: string,
        currentStatus: FriendshipStatus,
        action: 'add' | 'unfriend'
    ) => {
        if (!user) return;
        
        const optimisticUpdate = (newStatus: FriendshipStatus) => {
            setFriendshipStatuses(prev => new Map(prev).set(profileId, newStatus));
        };

        try {
            if (action === 'add' && currentStatus === 'not_friends') {
                optimisticUpdate('friends');
                const { data, error } = await supabase.from('follows').insert({
                    follower_id: user.id,
                    following_id: profileId,
                }).select().single();
                if (error) throw error;
                if (data) setFollows(prev => [...prev, data]);

            } else if (action === 'unfriend' && currentStatus === 'friends') {
                optimisticUpdate('not_friends');
                const { error } = await supabase.from('follows').delete()
                    .match({ follower_id: user.id, following_id: profileId });
                if (error) throw error;
                setFollows(prev => prev.filter(f => !(f.follower_id === user.id && f.following_id === profileId)));
            }
        } catch (e: any) {
            console.error("Follow action failed", e);
            optimisticUpdate(currentStatus);
            alert('An error occurred. Please try again.');
        }
    };

    return { friendshipStatuses, loading, handleFriendshipAction };
};
