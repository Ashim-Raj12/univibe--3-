
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Profile } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import Spinner from './Spinner';

const SuggestedUsers: React.FC = () => {
    const { user, profile } = useAuth();
    const [suggestions, setSuggestions] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!user || !profile) return;
            setLoading(true);

            // Suggest users from the same college, excluding the current user.
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('college', profile.college)
                .neq('id', user.id)
                .limit(5);

            if (error) {
                console.error('Error fetching suggestions:', error);
            } else {
                setSuggestions(data);
            }
            setLoading(false);
        };

        if (user && profile) {
            fetchSuggestions();
        } else {
            setLoading(false);
        }
    }, [user, profile]);

    if (loading) {
        return (
            <div className="bg-card p-4 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-text-heading mb-4">You Might Know</h3>
                <div className="flex justify-center"><Spinner /></div>
            </div>
        );
    }
    
    if (suggestions.length === 0) {
        return null; // Don't show the component if there are no suggestions or user is not fully loaded
    }

    return (
        <div className="bg-card p-4 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-text-heading mb-4">You Might Know</h3>
            <div className="space-y-4">
                {suggestions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                             <img
                                src={s.avatar_url || `https://avatar.vercel.sh/${s.id}.png`}
                                alt={s.name}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                                <Link to={`/profile/${s.id}`} className="font-semibold text-text-heading hover:underline text-sm">{s.name}</Link>
                                <p className="text-xs text-text-muted">{s.college}</p>
                            </div>
                        </div>
                        <Link to={`/profile/${s.id}`} className="text-sm font-semibold text-primary hover:underline">View</Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SuggestedUsers;