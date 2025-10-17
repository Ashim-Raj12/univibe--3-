import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { CommunityWithCreator, PostWithProfile, CommunityMember } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import PostCard from '../components/PostCard';
import PostForm from '../components/PostForm';
import VerifyCommunityModal from '../components/VerifyCommunityModal';
import CommunityMembersModal from '../components/CommunityMembersModal';
import StudyMaterials from '../components/StudyMaterials';
import VerifiedBadge from '../components/VerifiedBadge';

const CommunityPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user, profile } = useAuth();
    const [community, setCommunity] = useState<CommunityWithCreator | null>(null);
    const [posts, setPosts] = useState<PostWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [memberInfo, setMemberInfo] = useState<CommunityMember | null>(null);
    const [memberCount, setMemberCount] = useState(0);
    const [isJoinLoading, setIsJoinLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'files'>('posts');
    const [isPostingRestrictedByDomain, setIsPostingRestrictedByDomain] = useState(false);
    const [checkingPermissions, setCheckingPermissions] = useState(true);
    
    // In a real app, admin status should be determined by a proper role-based system, not a hardcoded ID.
    const isAdmin = profile?.id === '00000000-0000-0000-0000-000000000000'; // Placeholder for admin check
    const isMember = !!memberInfo;

    const fetchCommunityData = useCallback(async () => {
        if (!id || !user) return;
        setLoading(true);
        setError(null);
        setCheckingPermissions(true);

        try {
            const communityId = parseInt(id, 10);
            if (isNaN(communityId)) throw new Error("Invalid community ID.");

            // Fetch community details
            const { data: communityData, error: communityError } = await supabase
                .from('communities')
                .select('*, profiles:creator_id(*)')
                .eq('id', communityId)
                .single();
            
            if (communityError) throw communityError;
            setCommunity(communityData as CommunityWithCreator);

            // Fetch posts for this community
            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('*, profiles!inner(*), likes(*), comments!inner(count)')
                .eq('community_id', communityId)
                .order('created_at', { ascending: false });

            if (postsError) throw postsError;
            setPosts(postsData as any);
            
            // Fetch membership status and count
            const { count: memberCountData } = await supabase
                .from('community_members')
                .select('*', { count: 'exact', head: true })
                .eq('community_id', communityId);
            setMemberCount(memberCountData ?? 0);

            const { data: memberData } = await supabase
                .from('community_members')
                .select('*')
                .eq('community_id', communityId)
                .eq('user_id', user.id)
                .maybeSingle();
            setMemberInfo(memberData);

            // Fetch college domain restrictions
            const { data: collegeData, error: collegeError } = await supabase
                .from('colleges')
                .select('accepted_domain')
                .eq('name', communityData.college)
                .single();

            if (collegeError) {
                console.warn('Could not check college posting restrictions', collegeError);
            }

            if (collegeData?.accepted_domain) {
                const userDomain = user.email?.split('@')[1];
                if (userDomain !== collegeData.accepted_domain) {
                    setIsPostingRestrictedByDomain(true);
                } else {
                    setIsPostingRestrictedByDomain(false);
                }
            } else {
                setIsPostingRestrictedByDomain(false); // No restriction if domain is not set
            }

        } catch (e: any) {
             setError(e.message.includes('0 rows') ? "Community not found." : e.message);
        } finally {
            setLoading(false);
            setCheckingPermissions(false);
        }
    }, [id, user]);

    useEffect(() => {
        fetchCommunityData();
    }, [fetchCommunityData]);
    
    const handlePostDeleted = (postId: number) => {
        setPosts(posts.filter(p => p.id !== postId));
    };
    
    const handleNewPost = () => {
        fetchCommunityData(); // Refetch to see new post
    }

    const handleMembershipToggle = async () => {
        if (!user || !id || isJoinLoading) return;
        setIsJoinLoading(true);

        const communityId = parseInt(id, 10);

        if (isMember) {
            // Leave community
            const { error } = await supabase
                .from('community_members')
                .delete()
                .match({ community_id: communityId, user_id: user.id });
            if (!error) {
                setMemberInfo(null);
                setMemberCount(prev => prev - 1);
            }
        } else {
            // Join community
             const { data, error } = await supabase
                .from('community_members')
                .insert({ community_id: communityId, user_id: user.id })
                .select()
                .single();
             if (!error) {
                setMemberInfo(data);
                setMemberCount(prev => prev + 1);
            }
        }
        setIsJoinLoading(false);
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    }

    if (error) {
        return <p className="text-center text-red-500 p-8">{error}</p>;
    }

    if (!community) {
        return <p className="text-center text-gray-500 p-8">Could not load community.</p>;
    }
    
    const joinButtonClasses = `px-4 py-2 rounded-xl transition-all duration-300 font-semibold text-sm disabled:opacity-50 shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5
        ${isMember ? 'bg-slate-100 text-text-body hover:bg-slate-200' : 'bg-primary text-white hover:bg-primary-focus'}`;

    return (
        <>
            <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50 mb-6 overflow-hidden">
                <div className="relative h-48 bg-slate-200">
                    {community.banner_url ? (
                        <img
                            src={community.banner_url}
                            alt={`${community.name} banner`}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100"></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold text-text-heading">{community.name}</h1>
                                {community.is_verified && (
                                    <div className="flex items-center gap-1 text-sm font-semibold text-green-600" title="Verified Community">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-x-4 gap-y-1 text-sm text-text-body mt-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-9.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-9.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222 4 2.222V20M1 12l5.354 2.975M23 12l-5.354 2.975M5.646 15.025L12 18.25l6.354-3.225" /></svg>
                                    <span>{community.college}</span>
                                </div>
                                <button onClick={() => setIsMembersModalOpen(true)} className="flex items-center gap-1.5 hover:bg-slate-100 p-1 rounded-md focus:outline-none font-semibold">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                                </button>
                            </div>
                            <p className="mt-4 text-text-body">{community.description}</p>
                             <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                                Created by 
                                <Link to={`/profile/${community.profiles.id}`} className="font-semibold hover:underline inline-flex items-center gap-1">
                                    {community.profiles.name}
                                    {community.profiles.is_verified && <VerifiedBadge size="h-3 w-3" />}
                                </Link>
                            </p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                             {community.creator_id !== user?.id && (
                                <button onClick={handleMembershipToggle} disabled={isJoinLoading} className={joinButtonClasses}>
                                    {isJoinLoading ? <Spinner size="sm" /> : (isMember ? 'Joined' : 'Join')}
                                </button>
                            )}
                            {isAdmin && !community.is_verified && (
                                 <button onClick={() => setIsVerifyModalOpen(true)} className="bg-secondary text-white px-4 py-2 rounded-xl hover:bg-sky-600 transition-colors font-semibold text-sm shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5">
                                    Verify
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                 <div className="border-b border-slate-200/80">
                    <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={`${
                                activeTab === 'posts'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-text-muted hover:text-text-body hover:border-slate-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-colors focus:outline-none`}
                        >
                            Posts
                        </button>
                        <button
                            onClick={() => setActiveTab('files')}
                            className={`${
                                activeTab === 'files'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-text-muted hover:text-text-body hover:border-slate-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-colors focus:outline-none`}
                            aria-current={activeTab === 'files' ? 'page' : undefined}
                        >
                            Study Materials
                        </button>
                    </nav>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                     {activeTab === 'posts' && (
                        <>
                            {isMember && (
                                <div className="bg-card p-2 sm:p-4 rounded-2xl shadow-soft border border-slate-200/50">
                                    <h2 className="text-xl font-bold text-text-heading px-4 pt-2">Create a post in {community.name}</h2>
                                    {checkingPermissions ? (
                                        <div className="flex justify-center p-4"><Spinner /></div>
                                    ) : (
                                        <PostForm 
                                            onNewPost={handleNewPost} 
                                            communityId={community.id} 
                                            isPostingRestricted={isPostingRestrictedByDomain || !memberInfo?.can_post}
                                        />
                                    )}
                                </div>
                            )}
                            {posts.length > 0 ? (
                                posts.map(post => (
                                    <PostCard key={post.id} post={post} onPostDeleted={handlePostDeleted} onPostUpdated={fetchCommunityData} />
                                ))
                            ) : (
                                <p className="text-center text-gray-500 bg-card p-10 rounded-2xl border border-slate-200/50">
                                    {isMember ? "No posts in this community yet." : "No posts in this community yet."}
                                    {!memberInfo?.can_post && isMember && " You don't have permission to post."}
                                </p>
                            )}
                        </>
                     )}
                     {activeTab === 'files' && (
                        <StudyMaterials communityId={community.id} isMember={isMember} />
                     )}
                </div>
                <aside className="hidden lg:block space-y-6 sticky top-24">
                    <div className="bg-card p-5 rounded-2xl shadow-soft border border-slate-200/50">
                         <h3 className="text-lg font-bold text-text-heading mb-4">About</h3>
                         <p className="text-sm text-text-body">This is a placeholder for community information, rules, or members list.</p>
                    </div>
                </aside>
            </div>
            
            {isVerifyModalOpen && isAdmin && (
                <VerifyCommunityModal
                    community={community}
                    onClose={() => setIsVerifyModalOpen(false)}
                    onSuccess={() => {
                        setIsVerifyModalOpen(false);
                        fetchCommunityData();
                    }}
                />
            )}
            {isMembersModalOpen && (
                <CommunityMembersModal
                    communityId={community.id}
                    communityName={community.name}
                    creatorId={community.creator_id}
                    onClose={() => setIsMembersModalOpen(false)}
                />
            )}
        </>
    );
};

export default CommunityPage;