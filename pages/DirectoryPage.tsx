import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Profile } from '../types';
import UserCard, { FriendshipStatus } from '../components/UserCard';
import Spinner from '../components/Spinner';
import { useAuth } from '../hooks/useAuth';
import { useFriendships } from '../hooks/useFriendships';
import UserCardSkeleton from '../components/UserCardSkeleton';
import { MagicGrid } from '../components/MagicGrid';

const DirectoryPage: React.FC = () => {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [collegeFilter, setCollegeFilter] = useState('');
    const [stateFilter, setStateFilter] = useState('');

    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [debouncedCollege, setDebouncedCollege] = useState('');
    const [debouncedState, setDebouncedState] = useState('');

    const profileIds = useMemo(() => profiles.map(p => p.id), [profiles]);
    const { friendshipStatuses, handleFriendshipAction } = useFriendships(profileIds);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);
    
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedCollege(collegeFilter), 500);
        return () => clearTimeout(handler);
    }, [collegeFilter]);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedState(stateFilter), 500);
        return () => clearTimeout(handler);
    }, [stateFilter]);

    const fetchProfiles = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        let query = supabase.from('profiles').select('*').neq('id', user.id);

        if (debouncedSearch) query = query.ilike('name', `%${debouncedSearch}%`);
        if (debouncedCollege) query = query.ilike('college', `%${debouncedCollege}%`);
        if (debouncedState) query = query.ilike('state', `%${debouncedState}%`);

        const { data, error } = await query.order('name', { ascending: true }).limit(50);

        if (error) {
            console.error('Error fetching profiles:', error);
            setError(error.message);
        } else if (data) {
            setProfiles(data);
        }
        setLoading(false);
    }, [debouncedSearch, debouncedCollege, debouncedState, user]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    const filterInputClasses = "w-full p-3 bg-dark-card border-none rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-on-dark placeholder:text-text-muted";

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-heading mb-6">Find Fellows</h1>
            <div className="bg-card p-4 rounded-lg shadow-sm border border-slate-200/80 mb-6">
                <div className="grid md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className={filterInputClasses}
                    />
                    <input
                        type="text"
                        placeholder="Filter by college..."
                        value={collegeFilter}
                        onChange={e => setCollegeFilter(e.target.value)}
                        className={filterInputClasses}
                    />
                    <input
                        type="text"
                        placeholder="Filter by state..."
                        value={stateFilter}
                        onChange={e => setStateFilter(e.target.value)}
                        className={filterInputClasses}
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <UserCardSkeleton key={i} />)}
                </div>
            ) : error ? (
                <p className="text-center text-red-500">{error}</p>
            ) : profiles.length === 0 ? (
                <p className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">No users found matching your criteria.</p>
            ) : (
                <MagicGrid>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {profiles.map(profile => (
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

export default DirectoryPage;
