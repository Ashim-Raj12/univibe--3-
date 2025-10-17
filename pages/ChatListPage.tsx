import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile, Message, Conversation } from '../types';
import Spinner from '../components/Spinner';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { usePresence } from '../contexts/PresenceContext';
import VerifiedBadge from '../components/VerifiedBadge';

const ConversationItem: React.FC<{ conversation: Conversation, isOnline: boolean }> = ({ conversation, isOnline }) => {
    const { user } = useAuth();
    const isSender = conversation.last_message.sender_id === user?.id;

    const getDisplayContent = () => {
        const { content, file_url } = conversation.last_message;
        const textContent = content || '';
        
        const match = textContent.match(/^\[REPLY::.*?::REPLY\](.*)$/s);
        const mainContent = match ? match[1].trim() : textContent;

        let displayMessage = mainContent;
        if (!mainContent && file_url) {
            displayMessage = 'Sent a file';
        }
        
        if (isSender) {
            return `You: ${displayMessage}`;
        }
        return displayMessage;
    };

    return (
        <Link 
            to={`/chat/${conversation.profile.id}`} 
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-100 transition-colors"
        >
            <div className="relative flex-shrink-0">
                <img 
                    src={conversation.profile.avatar_url || `https://avatar.vercel.sh/${conversation.profile.id}.png`}
                    alt={conversation.profile.name}
                    className="w-12 h-12 rounded-full object-cover"
                />
                <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white transition-colors ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></span>
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                        <h3 className="font-bold text-text-heading truncate">{conversation.profile.name}</h3>
                        {conversation.profile.is_verified && <VerifiedBadge size="h-4 w-4"/>}
                    </div>
                    <p className="text-xs text-text-muted flex-shrink-0">
                        {formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: true })}
                    </p>
                </div>
                <p className="text-sm text-text-body truncate">{getDisplayContent()}</p>
            </div>
        </Link>
    );
};

const ChatListPage: React.FC = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const conversationsRef = useRef<Conversation[] | null>(null);
    const { onlineUsers } = usePresence();

    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    const fetchConversations = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        
        try {
            const { data: messages, error: messagesError } = await supabase
                .from('messages')
                .select('*')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: false })
                .limit(200);

            if (messagesError) throw messagesError;

            const conversationsMap = new Map<string, Message>();
            messages.forEach(message => {
                const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
                if (!conversationsMap.has(otherUserId)) {
                    conversationsMap.set(otherUserId, message);
                }
            });

            const otherUserIds = Array.from(conversationsMap.keys());
            if (otherUserIds.length === 0) {
                setConversations([]);
                setLoading(false);
                return;
            }

            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .in('id', otherUserIds);
            
            if (profilesError) throw profilesError;
            
            const loadedConversations: Conversation[] = profiles.map(profile => ({
                profile,
                last_message: conversationsMap.get(profile.id)!
            })).sort((a, b) => new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime());

            setConversations(loadedConversations);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);
    
    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel(`messages-for-${user.id}-list`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `or=(sender_id.eq.${user.id},receiver_id.eq.${user.id})` }, async (payload) => {
                const newMessage = payload.new as Message;
                
                const otherUserId = newMessage.sender_id === user.id ? newMessage.receiver_id : newMessage.sender_id;
                
                const currentConvos = conversationsRef.current || [];
                const existingConvo = currentConvos.find(c => c.profile.id === otherUserId);

                if (existingConvo) {
                    const updatedConvo = { ...existingConvo, last_message: newMessage };
                    const otherConvos = currentConvos.filter(c => c.profile.id !== otherUserId);
                    setConversations([updatedConvo, ...otherConvos]);
                } else {
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', otherUserId)
                        .single();

                    if (profileData && !profileError) {
                        const newConvo: Conversation = {
                            profile: profileData,
                            last_message: newMessage,
                        };
                        setConversations(prev => [newConvo, ...prev]);
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-text-heading mb-6">Messages</h1>
            <div className="bg-card rounded-lg shadow-sm border border-slate-200/80">
                {loading ? (
                    <div className="flex justify-center p-8"><Spinner size="lg" /></div>
                ) : error ? (
                    <p className="text-center text-red-500 p-8">{error}</p>
                ) : conversations.length === 0 ? (
                    <p className="text-center text-gray-500 p-8">No messages yet. Find fellows and start a conversation!</p>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {conversations.map(convo => (
                            <ConversationItem key={convo.profile.id} conversation={convo} isOnline={onlineUsers.has(convo.profile.id)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatListPage;
