import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile } from '../types';
import UserCard from '../components/UserCard';
import Spinner from '../components/Spinner';
import { useFriendships } from '../hooks/useFriendships';
import { useSearchParams } from 'react-router-dom';
import UserCardSkeleton from '../components/UserCardSkeleton';
import { MagicGrid } from '../components/MagicGrid';

type ViewType = 'followers' | 'following';

const FriendsListPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const [list, setList] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profileName, setProfileName] = useState('');
    
    const userId = searchParams.get('userId') || currentUser?.id;
    const view = (searchParams.get('view') as ViewType) || 'followers';

    const profileIds = useMemo(() => list.map(p => p.id), [list]);
    const { friendshipStatuses, handleFriendshipAction } = useFriendships(profileIds);

    const fetchList = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            setList([]);
            return;
        }
        
        setLoading(true);
        setError(null);
        setList([]);

        try {
            if (userId !== currentUser?.id) {
                const { data: profileData, error: profileError } = await supabase.from('profiles').select('name').eq('id', userId).single();
                if (profileError) throw profileError;
                setProfileName(`${profileData.name}'s`);
            } else {
                setProfileName('My');
            }

            let relationshipQuery;
            if (view === 'followers') {
                // Get users who are following the target user (their follower_id)
                relationshipQuery = supabase.from('follows').select('follower_id').eq('following_id', userId);
            } else { // 'following'
                // Get users the target user is following (their following_id)
                relationshipQuery = supabase.from('follows').select('following_id').eq('follower_id', userId);
            }
            
            const { data: relationshipData, error: relationshipError } = await relationshipQuery;
            if (relationshipError) throw relationshipError;

            const ids = relationshipData.map(r => view === 'followers' ? r.follower_id : r.following_id);

            if (ids.length === 0) {
                setList([]);
            } else {
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', ids);
                
                if (profilesError) throw profilesError;
                setList(profiles || []);
            }
        } catch (e: any) {
            setError(e.message);
            setList([]);
        } finally {
            setLoading(false);
        }
    }, [userId, view, currentUser]);


    useEffect(() => {
        fetchList();
    }, [fetchList]);
    
    const handleViewChange = (newView: ViewType) => {
        setSearchParams({ userId: userId || '', view: newView });
    };

    const tabClasses = (tabView: ViewType) =>
        `px-4 py-2 font-semibold text-sm rounded-md transition-colors ${
            view === tabView ? 'bg-primary text-white' : 'bg-slate-100 text-text-body hover:bg-slate-200'
        }`;


    return (
        <div>
            <h1 className="text-3xl font-bold text-text-heading mb-6">{profileName} Network</h1>
            
            <div className="flex items-center gap-2 mb-6">
                <button onClick={() => handleViewChange('followers')} className={tabClasses('followers')}>
                    Followers
                </button>
                <button onClick={() => handleViewChange('following')} className={tabClasses('following')}>
                    Following
                </button>
            </div>

             {loading ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <UserCardSkeleton key={i} />)}
                </div>
            ) : error ? (
                <p className="text-center text-red-500">{error}</p>
            ) : list.length === 0 ? (
                <p className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">
                    No {view} to show yet.
                </p>
            ) : (
                <MagicGrid>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {list.map(profile => (
                            <UserCard 
                                key={profile.id} 
                                profile={profile}
                                friendshipStatus={friendshipStatuses.get(profile.id) || 'not_friends'}
                                onFriendshipAction={handleFriendshipAction}
                            />
                        ))}
                    </div>
                </MagicGrid>
            )}
        </div>
    );
};

export default FriendsListPage;
