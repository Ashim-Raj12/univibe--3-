import React, { useState } from 'react';
import { Profile } from '../types';
import { Link } from 'react-router-dom';
import Spinner from './Spinner';
import { getEnrollmentStatusText } from '../pages/ProfilePage';
import MagicCard from './MagicCard';
import VerifiedBadge from './VerifiedBadge';
import { useAuth } from '../hooks/useAuth';

export type FriendshipStatus = 'not_friends' | 'friends';

interface MatchDetails {
    score: number;
    reasons: { type: string; value: string }[];
}

interface UserCardProps {
    profile: Profile;
    matchDetails?: MatchDetails;
    friendshipStatus: FriendshipStatus;
    onFriendshipAction: (profileId: string, currentStatus: FriendshipStatus, action: 'add' | 'unfriend') => Promise<void>;
}

const MatchReason: React.FC<{ reason: { type: string; value: string } }> = ({ reason }) => {
    const icons: { [key: string]: React.ReactNode } = {
        college: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-9.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-9.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222 4 2.222V20M1 12l5.354 2.975M23 12l-5.354 2.975M5.646 15.025L12 18.25l6.354-3.225" /></svg>,
        state: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        course: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
        hobby: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
        status: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    };

    return (
        <div className="flex items-start gap-1.5 text-xs text-text-body">
            <span className="text-primary mt-0.5">{icons[reason.type] || icons.hobby}</span>
            <span className="flex-1 capitalize">{reason.value}</span>
        </div>
    );
};

const UserCard: React.FC<UserCardProps> = ({ profile, matchDetails, friendshipStatus, onFriendshipAction }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleAction = async (e: React.MouseEvent, action: 'add' | 'unfriend') => {
        e.preventDefault();
        e.stopPropagation();
        setIsLoading(true);
        await onFriendshipAction(profile.id, friendshipStatus, action);
        setIsLoading(false);
    };
    
    const getScoreColor = (score: number) => {
        if (score >= 75) return 'bg-green-100 text-green-800';
        if (score >= 50) return 'bg-yellow-100 text-yellow-800';
        return 'bg-blue-100 text-blue-800';
    };

    const renderInteractionButton = () => {
        const baseClasses = "w-full px-4 py-2.5 rounded-xl transition-all duration-300 font-semibold text-sm flex-shrink-0 flex items-center justify-center min-h-[40px] shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5 active:scale-95";
        
        switch (friendshipStatus) {
            case 'friends': // This now means "following"
                return (
                    <button onClick={(e) => handleAction(e, 'unfriend')} disabled={isLoading} className={`${baseClasses} mt-4 bg-slate-100 text-text-body hover:bg-slate-200 disabled:opacity-50`}>
                        {isLoading ? <Spinner size="sm" /> : 'Following'}
                    </button>
                );
            case 'not_friends': // This now means "not following"
            default:
                return (
                    <button onClick={(e) => handleAction(e, 'add')} disabled={isLoading} className={`${baseClasses} mt-4 bg-primary text-white hover:bg-primary-focus disabled:opacity-50`}>
                        {isLoading ? <Spinner size="sm" /> : 'Follow'}
                    </button>
                );
        }
    };

    if (user?.id === profile.id) {
        return (
            <MagicCard>
                <div className="bg-card p-5 rounded-2xl shadow-soft border border-slate-200/50 flex flex-col justify-between h-full">
                    {matchDetails && (
                        <div className={`absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full ${getScoreColor(matchDetails.score)} z-10`}>
                            {matchDetails.score}% Match
                        </div>
                    )}
                    <div className="flex flex-col flex-grow">
                        <Link to={`/profile/${profile.id}`} className="block text-center flex-grow">
                            <img
                                src={profile.avatar_url || `https://avatar.vercel.sh/${profile.id}.png`}
                                alt={profile.name}
                                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-slate-100 shadow-sm"
                            />
                            <div className="flex items-center justify-center gap-1">
                                <h3 className="font-bold text-lg text-text-heading truncate">{profile.name}</h3>
                                {profile.is_verified && <VerifiedBadge />}
                            </div>
                            {profile.username && <p className="text-sm text-text-muted truncate">@{profile.username}</p>}
                            {profile.enrollment_status && (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-2 ${profile.enrollment_status === 'current_student' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                    {getEnrollmentStatusText(profile.enrollment_status)}
                                </span>
                            )}
                            <p className="text-sm text-text-body truncate mt-1">{profile.college}</p>
                            <p className="text-xs text-text-muted">{profile.state}</p>
                        
                            {matchDetails && matchDetails.reasons.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-1.5 text-left">
                                    {matchDetails.reasons.slice(0, 2).map((reason, index) => (
                                        <MatchReason key={index} reason={reason} />
                                    ))}
                                </div>
                            )}
                        </Link>
                        <div>
                             <div className="w-full px-4 py-2.5 rounded-xl mt-4 bg-slate-100 text-text-body font-semibold text-sm text-center">
                                It's You
                            </div>
                        </div>
                    </div>
                </div>
            </MagicCard>
        );
    }

    return (
        <MagicCard>
            <div className="bg-card p-5 rounded-2xl shadow-soft border border-slate-200/50 flex flex-col justify-between h-full">
                {matchDetails && (
                    <div className={`absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full ${getScoreColor(matchDetails.score)} z-10`}>
                        {matchDetails.score}% Match
                    </div>
                )}
                <div className="flex flex-col flex-grow">
                    <Link to={`/profile/${profile.id}`} className="block text-center flex-grow">
                        <img
                            src={profile.avatar_url || `https://avatar.vercel.sh/${profile.id}.png`}
                            alt={profile.name}
                            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-slate-100 shadow-sm"
                        />
                        <div className="flex items-center justify-center gap-1">
                            <h3 className="font-bold text-lg text-text-heading truncate">{profile.name}</h3>
                            {profile.is_verified && <VerifiedBadge />}
                        </div>
                        {profile.username && <p className="text-sm text-text-muted truncate">@{profile.username}</p>}
                        {profile.enrollment_status && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-2 ${profile.enrollment_status === 'current_student' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                {getEnrollmentStatusText(profile.enrollment_status)}
                            </span>
                        )}
                        <p className="text-sm text-text-body truncate mt-1">{profile.college}</p>
                        <p className="text-xs text-text-muted">{profile.state}</p>
                    
                         {matchDetails && matchDetails.reasons.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-1.5 text-left">
                                {matchDetails.reasons.slice(0, 2).map((reason, index) => (
                                    <MatchReason key={index} reason={reason} />
                                ))}
                            </div>
                        )}
                    </Link>

                    <div>
                        {renderInteractionButton()}
                    </div>
                </div>
            </div>
        </MagicCard>
    );
};

export default UserCard;