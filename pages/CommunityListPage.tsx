import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { CommunityWithMemberCount } from '../types';
import Spinner from '../components/Spinner';
import { Link } from 'react-router-dom';
import MagicCard from '../components/MagicCard';
import { MagicGrid } from '../components/MagicGrid';

const CommunityCard: React.FC<{ community: CommunityWithMemberCount }> = ({ community }) => {
    const memberCount = community.community_member_counts[0]?.count ?? 0;
    
    return (
        <MagicCard>
            <Link to={`/community/${community.id}`} className="block bg-card rounded-2xl shadow-sm border border-slate-200 transition-all overflow-hidden h-full">
                <div className="relative h-24 bg-slate-100">
                     {community.banner_url ? (
                        <img 
                            src={community.banner_url} 
                            alt={`${community.name} banner`} 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100"></div>
                    )}
                </div>
                <div className="p-4 flex flex-col">
                    <h3 className="font-bold text-lg text-text-heading truncate">{community.name}</h3>
                    <p className="text-sm text-text-body truncate h-10 flex-grow">{community.description}</p>
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-text-muted">{community.college}</p>
                        <p className="text-xs text-text-muted font-semibold">{memberCount} {memberCount === 1 ? 'member' : 'members'}</p>
                    </div>
                     {community.is_verified && (
                        <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-green-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span>Verified</span>
                        </div>
                    )}
                </div>
            </Link>
        </MagicCard>
    );
};


const CommunityListPage: React.FC = () => {
    const [communities, setCommunities] = useState<CommunityWithMemberCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

     useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchCommunities = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        let query = supabase.from('communities').select('*, community_member_counts(count)');

        if (debouncedSearch) {
            query = query.ilike('name', `%${debouncedSearch}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            setError(error.message);
        } else {
            setCommunities(data as any);
        }
        setLoading(false);
    }, [debouncedSearch]);

    useEffect(() => {
        fetchCommunities();
    }, [fetchCommunities]);

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-heading">Communities</h1>
            </div>
            
            <div className="bg-card p-4 rounded-lg shadow-sm border border-slate-200/80 mb-6">
                <input
                    type="text"
                    placeholder="Search for communities..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-3 bg-dark-card border-none rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-on-dark placeholder:text-text-muted"
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Spinner size="lg" /></div>
            ) : error ? (
                <p className="text-center text-red-500">{error}</p>
            ) : communities.length === 0 ? (
                 <p className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">No communities found. Why not create one?</p>
            ) : (
                <MagicGrid>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {communities.map(community => (
                            <CommunityCard key={community.id} community={community} />
                        ))}
                    </div>
                </MagicGrid>
            )}
        </>
    );
};

export default CommunityListPage;
