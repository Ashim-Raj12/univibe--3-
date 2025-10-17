import React, { createContext, useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '../types';
import { supabase } from '../services/supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refetchProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async (user: User | null) => {
         if (user) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                setProfile(null);
            } else {
                setProfile(data);
            }
        } catch (error) {
            setProfile(null);
        }
    } else {
        setProfile(null);
    }
    }, []);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            await fetchProfile(session?.user ?? null);
            setLoading(false);
        };
        
        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                if (_event !== 'SIGNED_OUT') {
                    await fetchProfile(currentUser);
                } else {
                    setProfile(null);
                }
            }
        );
        
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [fetchProfile]);
    
    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const refetchProfile = useCallback(async () => {
        if (user) {
            await fetchProfile(user);
        }
    }, [user, fetchProfile]);

    const value: AuthContextType = {
        session,
        user,
        profile,
        loading,
        signOut,
        refetchProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};