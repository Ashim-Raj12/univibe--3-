import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { StudyGroup, StudyGroupMessageWithProfile, Profile, ReplyInfo } from '../types';
import Spinner from '../components/Spinner';
import { format, isToday, isYesterday } from 'date-fns';
import VerifiedBadge from '../components/VerifiedBadge';
import EditGroupModal from '../components/EditGroupModal';
import InviteFriendsModal from '../components/InviteFriendsModal';
import { usePresence } from '../contexts/PresenceContext';
import { RealtimeChannel } from '@supabase/supabase-js';

const REPLY_PREFIX = '[REPLY::';
const REPLY_SUFFIX = '::REPLY]';
const REPLY_REGEX = /^\[REPLY::(.*?)::REPLY\](.*)$/s;

const formatReplyContent = (replyInfo: ReplyInfo, mainContent: string): string => {
    return `${REPLY_PREFIX}${JSON.stringify(replyInfo)}${REPLY_SUFFIX}${mainContent}`;
};

const parseReply = (content: string | null): { replyInfo: ReplyInfo | null; mainContent: string } => {
    if (!content) {
        return { replyInfo: null, mainContent: '' };
    }

    const match = content.match(REPLY_REGEX);

    if (!match) {
        return { replyInfo: null, mainContent: content };
    }

    try {
        const jsonPart = match[1];
        const mainContent = match[2];
        const replyInfo = JSON.parse(jsonPart);
        return { replyInfo, mainContent };
    } catch (e) {
        console.error("Failed to parse reply JSON:", e, "Content:", content);
        // Fallback if JSON is malformed
        return { replyInfo: null, mainContent: content };
    }
}

const ChatMessage: React.FC<{ message: StudyGroupMessageWithProfile; isSender: boolean; onDelete: (messageId: number) => void; onReply: (message: StudyGroupMessageWithProfile) => void; onEdit: (message: StudyGroupMessageWithProfile) => void; }> = ({ message, isSender, onDelete, onReply, onEdit }) => {
    const messageClasses = isSender
        ? 'bg-primary text-white self-end rounded-l-lg rounded-br-lg'
        : 'bg-slate-200 text-text-heading self-start rounded-r-lg rounded-bl-lg';

    const { replyInfo, mainContent } = parseReply(message.content);

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        if (isToday(date)) return format(date, 'p');
        if (isYesterday(date)) return `Yesterday ${format(date, 'p')}`;
        return format(date, 'MMM d, p');
    };

    return (
        <div className={`group relative flex w-full ${isSender ? 'justify-end animate-slide-in-right' : 'justify-start animate-slide-in-left'}`}>
            <div className={`flex items-start gap-3 ${isSender ? 'flex-row-reverse' : ''}`}>
                <Link to={`/profile/${message.profiles.id}`}>
                    <img src={message.profiles.avatar_url || `https://avatar.vercel.sh/${message.profiles.id}.png`} alt={message.profiles.name || ''} className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-5" />
                </Link>
                <div className="flex flex-col max-w-xs md:max-w-md">
                    <p className={`text-xs text-text-muted mb-1 font-semibold flex items-center gap-1 ${isSender ? 'self-end' : 'self-start'}`}>
                        {isSender ? 'You' : message.profiles.name}
                        {!isSender && message.profiles.is_verified && <VerifiedBadge size="h-3 w-3" />}
                    </p>
                    <div className="relative"> {/* Container for bubble + menu */}
                        <div className={`p-3 ${messageClasses}`}>
                            {replyInfo && (
                                <div className={`border-l-2 pl-2 mb-2 opacity-80 ${isSender ? 'border-white/50' : 'border-primary/50'}`}>
                                    <p className="font-bold text-xs">{replyInfo.senderName}</p>
                                    <p className="text-xs truncate">{replyInfo.content}</p>
                                </div>
                            )}
                            <p className="whitespace-pre-wrap break-words">{mainContent}</p>
                        </div>
                        <div className={`absolute top-1/2 -translate-y-1/2 flex gap-1 bg-white border rounded-full shadow-md p-1 transition-all duration-200 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 ${isSender ? 'left-0 -translate-x-full -ml-2 origin-left' : 'right-0 translate-x-full mr-2 origin-right'}`}>
                            <button onClick={() => onReply(message)} className="p-1 rounded-full hover:bg-slate-200" title="Reply"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                            {isSender && (
                                <>
                                <button onClick={() => onEdit(message)} className="p-1 rounded-full hover:bg-slate-200" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                                <button onClick={() => onDelete(message.id)} className="p-1 rounded-full hover:bg-slate-200" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                </>
                            )}
                        </div>
                    </div>
                    <p className={`text-xs text-text-muted mt-1 px-1 ${isSender ? 'self-end' : 'self-start'}`}>{formatTimestamp(message.created_at)}</p>
                </div>
            </div>
        </div>
    );
};

const GroupChatPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user, profile: currentUserProfile } = useAuth();
    const navigate = useNavigate();
    const [group, setGroup] = useState<StudyGroup | null>(null);
    const [members, setMembers] = useState<Profile[]>([]);
    const [messages, setMessages] = useState<StudyGroupMessageWithProfile[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isMember, setIsMember] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [typing, setTyping] = useState<Set<string>>(new Set());
    const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);
    const [editingMessage, setEditingMessage] = useState<StudyGroupMessageWithProfile | null>(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const { onlineUsers } = usePresence();
    const groupId = parseInt(id!, 10);

    useEffect(() => {
        if (editingMessage) {
            setNewMessage(parseReply(editingMessage.content).mainContent);
        }
    }, [editingMessage]);

    useEffect(() => {
        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.onresult = (event: any) => {
                    let interimTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            setNewMessage(prev => prev + event.results[i][0].transcript);
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }
                };
                recognitionRef.current = recognition;
            }
        } catch(e) { console.error("Speech recognition not supported", e); }
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const fetchData = useCallback(async (shouldReloadMessages = true) => {
        if (!user || isNaN(groupId)) return;
        setLoading(true);

        const { data: groupData, error: groupError } = await supabase.from('study_groups').select('*').eq('id', groupId).single();
        if (groupError || !groupData) { setLoading(false); return; }
        setGroup(groupData as StudyGroup);

        const { data: memberIds, error: memberError } = await supabase.from('study_group_members').select('user_id').eq('group_id', groupId);
        if (memberError) { setLoading(false); return; }

        const isUserMember = memberIds?.some(m => m.user_id === user.id) ?? false;
        setIsMember(isUserMember);

        if (groupData.type === 'private' && !isUserMember) { setLoading(false); return; }

        if (memberIds.length > 0) {
            const { data: profilesData } = await supabase.from('profiles').select('*').in('id', memberIds.map(m => m.user_id));
            setMembers(profilesData || []);
        }

        if (shouldReloadMessages) {
            const { data: messagesData } = await supabase.from('study_group_messages').select('*, profiles(*)').eq('group_id', groupId).order('created_at', { ascending: true });
            setMessages((messagesData as any) || []);
        }

        setLoading(false);
    }, [groupId, user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!user || isNaN(groupId) || (group?.type === 'private' && !isMember)) return;

        const handleNewMessage = (payload: any) => {
            const newMessage = payload.new as StudyGroupMessageWithProfile;
            const senderProfile = members.find(m => m.id === newMessage.user_id) || (newMessage.user_id === user.id ? currentUserProfile : null);

            if (senderProfile) {
                newMessage.profiles = senderProfile;
                setMessages(current => {
                    if (current.some(m => m.id === newMessage.id)) return current;
                    return [...current, newMessage];
                });
            }
        };

        const channel = supabase.channel(`group-chat-${groupId}`, { config: { presence: { key: currentUserProfile?.name || user.id } } })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_group_messages', filter: `group_id=eq.${groupId}` }, handleNewMessage)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'study_group_messages', filter: `group_id=eq.${groupId}` }, payload => {
            const updatedMessage = payload.new as StudyGroupMessageWithProfile;
            setMessages(current => current.map(m => {
                if (m.id === updatedMessage.id) {
                    return { ...updatedMessage, profiles: m.profiles };
                }
                return m;
            }));
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'study_group_messages', filter: `group_id=eq.${groupId}` }, payload => setMessages(current => current.filter(m => m.id !== (payload.old as any).id)))
        .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState();
            const typingUsers = new Set<string>();
            for (const key in presenceState) {
                const presences = presenceState[key] as unknown as { name: string, is_typing: boolean }[];
                if (presences.some(p => p.is_typing)) {
                    typingUsers.add(presences[0].name);
                }
            }
            setTyping(typingUsers);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                channelRef.current = channel;
                await channel.track({ is_typing: false, name: currentUserProfile?.name || user.id });
            }
        });

        return () => { supabase.removeChannel(channel); channelRef.current = null; };
    }, [groupId, user, isMember, members, group, currentUserProfile]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing]);

    const handleUpdateMessage = async (newContent: string) => {
        if (!editingMessage) return;
        setIsSending(true);

        const { replyInfo } = parseReply(editingMessage.content);
        let finalContent = newContent;
        if (replyInfo) {
            finalContent = formatReplyContent(replyInfo, newContent);
        }
        
        const { error } = await supabase.from('study_group_messages').update({ content: finalContent }).eq('id', editingMessage.id);
        
        setNewMessage('');
        setEditingMessage(null);
        setIsSending(false);

        if (error) {
            alert("Failed to update message: " + error.message);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = newMessage.trim();
        if (!content || !user || !isMember || !currentUserProfile) return;
        
        if (editingMessage) {
            handleUpdateMessage(content);
            return;
        }
    
        setIsSending(true);
        setNewMessage(''); 

        if (channelRef.current) await channelRef.current.track({ is_typing: false, name: currentUserProfile?.name });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
        
        let finalContent = content;
        if (replyingTo) {
            finalContent = formatReplyContent(replyingTo, content);
        }
    
        const { error } = await supabase.from('study_group_messages').insert({ group_id: groupId, user_id: user.id, content: finalContent });
        
        setReplyingTo(null);
        setIsSending(false);
        if (error) {
            console.error("Failed to send message:", error);
            setNewMessage(content); 
            alert("Failed to send message.");
        }
    };
    
    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        if (!channelRef.current) return;
        if (!typingTimeoutRef.current) channelRef.current.track({ is_typing: true, name: currentUserProfile?.name || user.id });
        else clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            channelRef.current?.track({ is_typing: false, name: currentUserProfile?.name || user.id });
            typingTimeoutRef.current = null;
        }, 2000);
    };

    const handleDeleteMessage = async (messageId: number) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;
        await supabase.from('study_group_messages').delete().eq('id', messageId);
    };

    if (loading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    if (!group) return <p className="text-center p-8">Group not found.</p>;
    if (group.type === 'private' && !isMember) return <p className="text-center p-8">This is a private group. You must be invited to join.</p>;

    const isCreator = user?.id === group.creator_id;
    const typingUsers = [...typing].filter(name => name !== (currentUserProfile?.name || user.id));
    
    const MemberItem: React.FC<{ member: Profile }> = ({ member }) => (
        <Link to={`/profile/${member.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-200">
            <div className="relative">
                <img src={member.avatar_url || `https://avatar.vercel.sh/${member.id}.png`} alt={member.name || ''} className="w-8 h-8 rounded-full" />
                {onlineUsers.has(member.id) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-100"></div>}
            </div>
            <span className="font-semibold text-sm truncate">{member.name}</span>
        </Link>
    );
    
    const TypingIndicator = () => {
        if (typingUsers.length === 0) return <div className="h-4"></div>;
        const text = typingUsers.length > 2 ? `${typingUsers.length} people are typing...` : `${typingUsers.join(' and ')} ${typingUsers.length > 1 ? 'are' : 'is'} typing...`;
        return <p className="text-xs text-text-muted h-4 px-4 animate-pulse">{text}</p>;
    };

    return (
        <div className="flex h-full max-w-6xl mx-auto">
            <div className="flex flex-col flex-1 bg-card rounded-2xl shadow-soft border border-slate-200/50">
                <header className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-primary rounded-full transition-colors flex-shrink-0" aria-label="Back"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
                        <button onClick={isCreator ? () => setIsEditModalOpen(true) : undefined} disabled={!isCreator} className={`flex items-center gap-3 text-left ${isCreator ? 'cursor-pointer group hover:bg-slate-50 p-2 rounded-lg -m-2' : 'cursor-default'} min-w-0`}>
                            <img src={group.avatar_url || `https://avatar.vercel.sh/${group.id}.png?text=${group.name[0]}`} alt={group.name} className="w-10 h-10 rounded-full object-cover bg-slate-200 flex-shrink-0" />
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h2 className={`font-bold text-text-heading truncate ${isCreator ? 'group-hover:underline' : ''}`}>{group.name}</h2>
                                    {isCreator && (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>)}
                                </div>
                                <p className="text-xs text-text-muted truncate">{members.length} members</p>
                            </div>
                        </button>
                    </div>
                    <div className="flex-shrink-0">{isCreator && group.type === 'private' && (<button onClick={() => setIsInviteModalOpen(true)} className="text-sm font-semibold text-primary whitespace-nowrap">Invite Members</button>)}</div>
                </header>

                <main className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg) => (
                        <ChatMessage 
                            key={msg.id} 
                            message={msg} 
                            isSender={msg.user_id === user?.id} 
                            onDelete={handleDeleteMessage} 
                            onReply={(m) => {
                                setReplyingTo({ id: m.id, content: parseReply(m.content).mainContent, senderId: m.user_id, senderName: m.profiles.name || ''});
                                setEditingMessage(null);
                            }} 
                            onEdit={(m) => {
                                setEditingMessage(m);
                                setReplyingTo(null);
                            }} 
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </main>

                <footer className="p-4 border-t border-slate-200 space-y-1">
                    {(replyingTo || editingMessage) && (
                        <div className="p-2 bg-slate-100 rounded-lg flex items-center justify-between text-sm animate-fade-in-up" style={{animationDuration: '0.3s'}}>
                            <div>
                                <p className="font-bold text-primary">{editingMessage ? 'Editing Message' : `Replying to ${replyingTo?.senderName}`}</p>
                                <p className="text-text-body truncate max-w-xs">{editingMessage ? parseReply(editingMessage.content).mainContent : replyingTo?.content}</p>
                            </div>
                            <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setNewMessage(''); }} className="p-1.5 rounded-full hover:bg-slate-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                    )}
                    <TypingIndicator />
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 mt-1">
                        {recognitionRef.current && (
                            <button type="button" onClick={toggleListening} className={`text-text-muted hover:text-primary transition-all p-3 rounded-lg flex-shrink-0 ${isListening ? 'text-red-500 animate-pulse' : ''} transform hover:scale-110 active:scale-95`} title="Voice message"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button>
                        )}
                        <input type="text" value={newMessage} onChange={handleTyping} placeholder="Type a message..." className="w-full p-3 bg-slate-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" disabled={isSending} />
                        <button type="submit" disabled={isSending || !newMessage.trim()} className="text-white bg-primary disabled:bg-slate-400 hover:bg-primary-focus transition-all hover:scale-105 active:scale-95 rounded-lg p-3 flex-shrink-0">{isSending ? <Spinner size="sm" /> : editingMessage ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}</button>
                    </form>
                </footer>
            </div>
            <aside className="w-64 flex-shrink-0 p-4 border-l border-slate-200 overflow-y-auto hidden md:block">
                <h3 className="font-bold text-lg mb-2">Members</h3>
                <div className="space-y-1">
                    {members.map(m => <MemberItem key={m.id} member={m} />)}
                </div>
            </aside>
            {isEditModalOpen && isCreator && <EditGroupModal group={group} onClose={() => setIsEditModalOpen(false)} onSuccess={() => fetchData(false)} />}
            {isInviteModalOpen && isCreator && <InviteFriendsModal group={group} members={members} onClose={() => setIsInviteModalOpen(false)} />}
        </div>
    );
};

export default GroupChatPage;
