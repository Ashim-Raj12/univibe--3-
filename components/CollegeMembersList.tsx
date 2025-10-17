import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Profile } from '../types';
import UserCard from './UserCard';
import UserCardSkeleton from './UserCardSkeleton';
import { useFriendships } from '../hooks/useFriendships';

interface CollegeMembersListProps {
    collegeName: string;
}

const CollegeMembersList: React.FC<CollegeMembersListProps> = ({ collegeName }) => {
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const profileIds = useMemo(() => members.map(p => p.id), [members]);
    const { friendshipStatuses, handleFriendshipAction } = useFriendships(profileIds);

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('college', collegeName)
            .order('name', { ascending: true });
        
        if (error) {
            setError(error.message);
        } else {
            setMembers(data);
        }
        setLoading(false);
    }, [collegeName]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-2">
                {[...Array(6)].map((_, i) => <UserCardSkeleton key={i} />)}
            </div>
        );
    }

    if (error) {
        return <p className="text-center text-red-500 p-8">{error}</p>;
    }

    if (members.length === 0) {
        return <p className="text-center text-gray-500 p-8">No members from this college found yet.</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-2">
            {members.map(profile => (
                <UserCard
                    key={profile.id}
                    profile={profile}
                    friendshipStatus={friendshipStatuses.get(profile.id) || 'not_friends'}
                    onFriendshipAction={handleFriendshipAction}
                />
            ))}
        </div>
    );
};

export default CollegeMembersList;
