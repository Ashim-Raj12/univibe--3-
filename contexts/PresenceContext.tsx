import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

interface PresenceContextType {
    onlineUsers: Set<string>;
}

const PresenceContext = createContext<PresenceContextType>({ onlineUsers: new Set() });

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!user) {
            setOnlineUsers(new Set());
            return;
        }

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        const handleSync = () => {
            const newState = new Set<string>();
            const presenceState = channel.presenceState();
            for (const id in presenceState) {
                newState.add(id);
            }
            setOnlineUsers(newState);
        };

        const handleJoin = ({ newPresences }: { newPresences: { key: string }[] }) => {
            setOnlineUsers(prev => {
                const updated = new Set(prev);
                newPresences.forEach(p => updated.add(p.key));
                return updated;
            });
        };

        const handleLeave = ({ leftPresences }: { leftPresences: { key: string }[] }) => {
            setOnlineUsers(prev => {
                const updated = new Set(prev);
                leftPresences.forEach(p => updated.delete(p.key));
                return updated;
            });
        };
        
        // Periodically update the user's last_seen timestamp
        const interval = setInterval(() => {
            const update = async () => {
                const { error } = await supabase.rpc('update_last_seen');
                if (error) {
                    console.error('Error updating last_seen timestamp:', error);
                }
            };
            update();
        }, 30000); // every 30 seconds

        channel
            .on('presence', { event: 'sync' }, handleSync)
            .on('presence', { event: 'join' }, handleJoin)
            .on('presence', { event: 'leave' }, handleLeave);

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ online_at: new Date().toISOString() });
                const { error } = await supabase.rpc('update_last_seen');
                if (error) {
                    console.error('Error updating last_seen on join:', error);
                }
            }
        });

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, [user]);

    return (
        <PresenceContext.Provider value={{ onlineUsers }}>
            {children}
        </PresenceContext.Provider>
    );
};

export const usePresence = () => useContext(PresenceContext);