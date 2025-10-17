import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Profile } from '../types';
import UserCard from '../components/UserCard';
import Spinner from '../components/Spinner';
import { useAuth } from '../hooks/useAuth';
import { useFriendships } from '../hooks/useFriendships';
import UserCardSkeleton from '../components/UserCardSkeleton';
import { Link } from 'react-router-dom';
import { MagicGrid } from '../components/MagicGrid';

interface Suggestion {
    profile: Profile;
    score: number;
    reasons: { type: string; value: string }[];
}

const calculateCompatibility = (currentUser: Profile, otherUser: Profile): Suggestion | null => {
    let score = 0;
    const reasons: { type: string; value: string }[] = [];

    if (currentUser.college && otherUser.college && currentUser.college.toLowerCase() === otherUser.college.toLowerCase()) {
        score += 50;
        reasons.push({ type: 'college', value: `Same college: ${currentUser.college}` });
    }
    if (currentUser.state && otherUser.state && currentUser.state.toLowerCase() === otherUser.state.toLowerCase()) {
        score += 15;
        reasons.push({ type: 'state', value: `Same state: ${currentUser.state}` });
    }
    if (currentUser.course && otherUser.course && currentUser.course.toLowerCase() === otherUser.course.toLowerCase()) {
        score += 25;
        reasons.push({ type: 'course', value: `Same course: ${currentUser.course}` });
    }
    if (currentUser.enrollment_status && otherUser.enrollment_status && currentUser.enrollment_status === otherUser.enrollment_status) {
        score += 10;
        reasons.push({ type: 'status', value: `Both are ${currentUser.enrollment_status === 'incoming_student' ? 'future students' : 'current students'}` });
    }

    if (currentUser.hobbies_interests && otherUser.hobbies_interests) {
        const currentUserHobbies = new Set(currentUser.hobbies_interests.split(',').map(h => h.trim().toLowerCase()));
        const otherUserHobbies = new Set(otherUser.hobbies_interests.split(',').map(h => h.trim().toLowerCase()));
        
        currentUserHobbies.forEach(hobby => {
            if (hobby && otherUserHobbies.has(hobby)) {
                score += 5;
                reasons.push({ type: 'hobby', value: `Shared interest: ${hobby}` });
            }
        });
    }

    if (score === 0) return null;

    return { profile: otherUser, score, reasons };
};

const SuggestionsPage: React.FC = () => {
    const { user, profile } = useAuth();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const profileIds = useMemo(() => suggestions.map(s => s.profile.id), [suggestions]);
    const { friendshipStatuses, handleFriendshipAction } = useFriendships(profileIds);

    const fetchSuggestions = useCallback(async () => {
        if (!user || !profile || !profile.college) { 
            setLoading(false); 
            return; 
        }
        setLoading(true);
        setError(null);

        try {
            // Build a more efficient query to only get potentially relevant users
            const filters = [
                profile.college ? `college.eq.${profile.college}` : null,
                profile.state ? `state.eq.${profile.state}` : null,
                profile.course ? `course.eq.${profile.course}` : null,
            ].filter((f): f is string => f !== null).join(',');

            if (!filters) {
                setSuggestions([]);
                setLoading(false);
                return;
            }

            const { data: potentialMatches, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id)
                .or(filters);

            if (fetchError) throw fetchError;

            const calculatedSuggestions = potentialMatches
                .map(p => calculateCompatibility(profile, p))
                .filter((s): s is Suggestion => s !== null && s.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 20); // Limit to top 20 suggestions

            setSuggestions(calculatedSuggestions);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [user, profile]);

    useEffect(() => {
        if (profile) {
            fetchSuggestions();
        } else if (!user) {
            setLoading(false);
        }
    }, [fetchSuggestions, profile, user]);

    if (loading) {
        return (
            <div>
                <h1 className="text-3xl font-bold text-text-heading mb-6">Suggestions For You</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <UserCardSkeleton key={i} />)}
                </div>
            </div>
        );
    }

    if (error) return <p className="text-center text-red-500 p-8">{error}</p>;
    
    if (!profile || !profile.college) {
        return (
            <div className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">
                <p>Complete your profile with your college, course, and interests to get personalized suggestions!</p>
                <Link to={`/profile/${user?.id}`} className="mt-4 inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus font-semibold">
                    Go to Profile
                </Link>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-heading mb-6">Suggestions For You</h1>
            {suggestions.length === 0 ? (
                 <p className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">
                    No great matches found right now. We'll keep looking as more users join!
                </p>
            ) : (
                <MagicGrid>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {suggestions.map(({ profile, score, reasons }) => (
                            <UserCard 
                                key={profile.id} 
                                profile={profile} 
                                matchDetails={{ score, reasons }}
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

export default SuggestionsPage;
