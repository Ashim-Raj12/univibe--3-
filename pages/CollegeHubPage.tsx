import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { CommunityWithMemberCount, Profile } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import { Link } from 'react-router-dom';
import HelpDesk from '../components/HelpDesk';
import { usePresence } from '../contexts/PresenceContext';
import CollegeMembersList from '../components/CollegeMembersList';
import CollegeChat from '../components/CollegeChat';
import MagicCard from '../components/MagicCard';

const CompactCommunityItem: React.FC<{ community: CommunityWithMemberCount }> = ({ community }) => (
    <MagicCard enableMagnetism={false} particleCount={4}>
        <Link to={`/community/${community.id}`} className="block p-3 rounded-xl bg-card hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
                <img 
                    src={community.banner_url || `https://placehold.co/100x100/e2e8f0/e2e8f0`} 
                    alt={`${community.name} banner`} 
                    className="w-11 h-11 object-cover rounded-lg bg-slate-100 flex-shrink-0"
                />
                <div className="flex-1 overflow-hidden">
                    <h4 className="font-bold text-text-heading truncate">{community.name}</h4>
                    <p className="text-xs text-text-muted">{community.community_member_counts[0]?.count ?? 0} members</p>
                </div>
            </div>
        </Link>
    </MagicCard>
);


const CollegeHubPage: React.FC = () => {
    const { profile, user } = useAuth();
    const { onlineUsers } = usePresence();
    const [communities, setCommunities] = useState<CommunityWithMemberCount[]>([]);
    const [totalMembers, setTotalMembers] = useState(0);
    const [onlineMembers, setOnlineMembers] = useState(0);
    const [isModerator, setIsModerator] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'members' | 'communities' | 'chat' | 'help'>('members');

    const collegeName = profile?.college;

    const fetchData = useCallback(async () => {
        if (!collegeName || !user?.email) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const communitiesPromise = supabase
                .from('communities')
                .select('*, community_member_counts(count)')
                .eq('college', collegeName)
                .order('created_at', { ascending: false })
                .limit(5);
            
            const profilesPromise = supabase
                .from('profiles')
                .select('id', { count: 'exact' })
                .eq('college', collegeName);

            const collegeModeratorPromise = supabase
                .from('colleges')
                .select('accepted_domain')
                .eq('name', collegeName)
                .single();

            const [
                { data: communitiesData, error: communitiesError },
                { data: profilesData, error: profilesError, count: profilesCount },
                { data: collegeData, error: collegeError }
            ] = await Promise.all([communitiesPromise, profilesPromise, collegeModeratorPromise]);

            if (communitiesError) throw communitiesError;
            if (profilesError) throw profilesError;
            if (collegeError) console.warn("Could not fetch college moderator info", collegeError);

            if (collegeData?.accepted_domain) {
                const userDomain = user.email.split('@')[1];
                if (userDomain === collegeData.accepted_domain) {
                    setIsModerator(true);
                } else {
                    setIsModerator(false);
                }
            } else {
                setIsModerator(false);
            }
            
            setCommunities(communitiesData as any);
            setTotalMembers(profilesCount || 0);

            if (profilesData) {
                const collegeMemberIds = new Set(profilesData.map(p => p.id));
                const onlineCount = [...onlineUsers].filter(id => collegeMemberIds.has(id)).length;
                setOnlineMembers(onlineCount);
            }

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [collegeName, onlineUsers, user?.email]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (!collegeName && !loading) {
        return (
            <div className="text-center text-gray-500 bg-card p-10 rounded-2xl border border-slate-200/80">
                <p>Please complete your profile with your college to access the College Hub!</p>
                <Link to={`/profile/${user?.id}`} className="mt-4 inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus font-semibold">
                    Go to Profile
                </Link>
            </div>
        );
    }
    
    const TabButton: React.FC<{ tabName: 'members' | 'communities' | 'chat' | 'help'; icon: React.ReactNode; children: React.ReactNode }> = ({ tabName, icon, children }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center gap-2 whitespace-nowrap py-4 px-2 border-b-2 font-semibold text-sm transition-colors focus:outline-none ${
                activeTab === tabName
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-body hover:border-slate-300'
            }`}
        >
            {icon}
            {children}
        </button>
    );

    const icons = {
        members: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>,
        communities: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3 1h2v2H5V6zm4 0h2v2H9V6zm4 0h2v2h-2V6zm-4 4h2v2H9v-2zm-4 0h2v2H5v-2zm8 0h2v2h-2v-2z" /></svg>,
        chat: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" /></svg>,
        help: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>,
    };

    return (
        <>
            <div className="relative bg-card rounded-2xl shadow-soft border border-slate-200/50 mb-8 overflow-hidden">
                 <div className="absolute -top-1/2 -right-1/4 w-full h-full bg-gradient-to-br from-primary/10 to-secondary/5 rounded-full blur-3xl opacity-50 z-10"></div>
                <div className="relative z-20 p-6 md:p-8">
                    <p className="text-primary font-semibold">Welcome to the</p>
                    <h1 className="text-4xl font-extrabold text-text-heading mt-1">{collegeName} Hub</h1>
                    <div className="flex items-center flex-wrap gap-x-6 gap-y-2 mt-4 text-text-body">
                         <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <span className="font-semibold">{totalMembers} Members</span>
                        </div>
                         <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="font-semibold">{onlineMembers} Online</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
                 <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50">
                        <div className="border-b border-slate-200/80">
                            <nav className="-mb-px flex space-x-2 sm:space-x-6 px-4 sm:px-6 flex-wrap" aria-label="Tabs">
                                <TabButton tabName="members" icon={icons.members}>Members</TabButton>
                                <TabButton tabName="communities" icon={icons.communities}>Communities</TabButton>
                                <TabButton tabName="chat" icon={icons.chat}>Chat</TabButton>
                                <TabButton tabName="help" icon={icons.help}>Help Desk</TabButton>
                            </nav>
                        </div>
                        <div className="p-2 sm:p-4 min-h-[60vh] relative">
                             {loading && activeTab !=='chat' && (
                                <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-b-2xl z-10"><Spinner /></div>
                            )}
                            {activeTab === 'members' && <CollegeMembersList collegeName={collegeName!} />}
                            {activeTab === 'communities' && (
                                <div className="p-2">
                                    {communities.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8">No communities found for your college.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {communities.map(c => <CompactCommunityItem key={c.id} community={c} />)}
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'chat' && <CollegeChat collegeName={collegeName!} profile={profile!} />}
                            {activeTab === 'help' && <HelpDesk collegeName={collegeName!} isModerator={isModerator} />}
                        </div>
                    </div>
                </div>
                
                <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                     <div className="bg-card p-5 rounded-2xl shadow-soft border border-slate-200/50">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-text-heading">Top Communities</h2>
                             <Link to="/communities" className="text-sm font-semibold text-primary hover:underline">View All</Link>
                        </div>
                        {loading ? <Spinner /> : error ? <p className="text-red-500 text-sm">Could not load communities.</p> : communities.length === 0 ? (
                            <p className="text-sm text-center text-text-muted py-4">No communities yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {communities.map(c => <CompactCommunityItem key={c.id} community={c} />)}
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </>
    );
};

export default CollegeHubPage;