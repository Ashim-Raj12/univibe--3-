import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Profile, CollegeGroupMessageWithProfile } from '../types';
import Spinner from './Spinner';
import { format, isToday, isYesterday } from 'date-fns';
import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';

interface CollegeChatProps {
    collegeName: string;
    profile: Profile;
}

const ChatMessage: React.FC<{ message: CollegeGroupMessageWithProfile; isSender: boolean; onDelete: (messageId: number) => void; }> = ({ message, isSender, onDelete }) => {
    const messageClasses = isSender
        ? 'bg-primary text-white self-end rounded-l-lg rounded-br-lg'
        : 'bg-slate-200 text-text-heading self-start rounded-r-lg rounded-bl-lg';

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        if (isToday(date)) return format(date, 'p');
        if (isYesterday(date)) return `Yesterday ${format(date, 'p')}`;
        return format(date, 'MMM d, p');
    };

    return (
        <div className={`group relative flex items-start gap-3 w-full ${isSender ? 'flex-row-reverse' : ''}`}>
            <Link to={`/profile/${message.profiles.id}`}>
                <img
                    src={message.profiles.avatar_url || `https://avatar.vercel.sh/${message.profiles.id}.png`}
                    alt={message.profiles.name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-5"
                />
            </Link>
            <div className={`flex flex-col max-w-xs md:max-w-md ${isSender ? 'items-end' : 'items-start'}`}>
                <p className={`text-xs text-text-muted mb-1 font-semibold flex items-center gap-1 ${isSender ? 'mr-2' : 'ml-2'}`}>
                    {isSender ? 'You' : message.profiles.name}
                    {!isSender && message.profiles.is_verified && <VerifiedBadge size="h-3 w-3" />}
                </p>
                <div className={`p-3 ${messageClasses}`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className="text-xs text-text-muted mt-1 px-1">{formatTimestamp(message.created_at)}</p>
            </div>
             {isSender && (
                <button
                    onClick={() => onDelete(message.id)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text-muted hover:text-red-500"
                    aria-label="Delete message"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            )}
        </div>
    );
};

const CollegeChat: React.FC<CollegeChatProps> = ({ collegeName, profile }) => {
    const [messages, setMessages] = useState<CollegeGroupMessageWithProfile[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    const fetchMessages = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('college_group_chats')
            .select('*, profiles(*)')
            .eq('college', collegeName)
            .order('created_at', { ascending: true })
            .limit(100);

        if (data) {
            setMessages(data as any);
        }
        setLoading(false);
    }, [collegeName]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);
    
    useEffect(() => {
        scrollToBottom('auto');
    }, [messages, loading]);

    useEffect(() => {
        const channel = supabase
            .channel(`college-chat-${collegeName}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'college_group_chats', filter: `college=eq.${collegeName}` },
                async (payload) => {
                    const { data: newMsg, error } = await supabase
                        .from('college_group_chats')
                        .select('*, profiles(*)')
                        .eq('id', payload.new.id)
                        .single();
                    if (newMsg && !error) {
                        setMessages(current => [...current, newMsg as any]);
                    }
                }
            )
            .on(
                 'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'college_group_chats', filter: `college=eq.${collegeName}` },
                (payload) => {
                    setMessages(current => current.filter(m => m.id !== (payload.old as any).id));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [collegeName]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !profile) return;

        setIsSending(true);
        const { error } = await supabase.from('college_group_chats').insert({
            user_id: profile.id,
            college: collegeName,
            content: newMessage.trim(),
        });
        
        if (error) {
            console.error(error);
            alert("Failed to send message.");
        } else {
            setNewMessage('');
        }
        setIsSending(false);
    };
    
    const handleDeleteMessage = async (messageId: number) => {
        // Optimistic UI update
        setMessages(prev => prev.filter(m => m.id !== messageId));
        
        const { error } = await supabase.from('college_group_chats').delete().eq('id', messageId);
        if (error) {
            console.error("Failed to delete message:", error);
            // Revert on error
            fetchMessages(); 
            alert("Could not delete message.");
        }
    };


    return (
        <div className="flex flex-col h-[70vh]">
            <main className="flex-1 p-4 overflow-y-auto space-y-4">
                {loading ? (
                    <div className="flex justify-center items-center h-full"><Spinner /></div>
                ) : (
                    <>
                        {messages.map(msg => (
                            <ChatMessage key={msg.id} message={msg} isSender={msg.user_id === profile.id} onDelete={handleDeleteMessage} />
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </main>

            <footer className="p-4 border-t border-slate-200">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full p-3 bg-slate-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-colors"
                        disabled={isSending}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                    />
                    <button type="submit" disabled={isSending || !newMessage.trim()} className="text-white bg-primary disabled:bg-slate-400 hover:bg-primary-focus transition-colors rounded-lg p-3 flex-shrink-0">
                        {isSending ? <Spinner size="sm" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default CollegeChat;