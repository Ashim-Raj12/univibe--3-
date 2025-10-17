import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile, Message, ReplyInfo } from '../types';
import Spinner from '../components/Spinner';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { usePresence } from '../contexts/PresenceContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import VerifiedBadge from '../components/VerifiedBadge';
import IcebreakerModal from '../components/IcebreakerModal';

// --- Helper Functions for Reply ---
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


const FileMessageContent: React.FC<{ message: Message }> = ({ message }) => {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!message.file_url) {
            setLoading(false);
            return;
        }

        if (message.file_url.startsWith('http')) {
            setUrl(message.file_url);
            setLoading(false);
            return;
        }

        const createSignedUrl = async () => {
            const { data, error } = await supabase.storage
                .from('chat-files')
                .createSignedUrl(message.file_url!, 60 * 5); 

            if (error) {
                console.error('Error creating signed URL:', error);
                setUrl(null);
            } else {
                setUrl(data.signedUrl);
            }
            setLoading(false);
        };

        createSignedUrl();
    }, [message.file_url]);


    if (!message.file_url || !message.file_type) return null;

    if (loading) {
        return <div className="mt-2 flex justify-center items-center h-24 w-24 bg-slate-100 rounded-lg"><Spinner size="sm" /></div>;
    }

    if (!url) {
        return <div className="mt-2 text-red-600 text-xs p-2 bg-red-100 rounded-lg">Could not load file.</div>;
    }

    if (message.file_type.startsWith('image/')) {
        return <img src={url} alt="Shared content" className="mt-2 rounded-lg max-w-full h-auto max-h-64 object-contain" />;
    }

    const fileName = message.file_url.split('/').pop()?.split('_').slice(1).join('_') || 'Download File';
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" download={fileName} className="mt-2 flex items-center gap-2 bg-slate-300/50 p-2 rounded-lg hover:bg-slate-300/80 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="truncate text-sm">{fileName}</span>
        </a>
    );
};


const ChatMessage: React.FC<{ message: Message; isSender: boolean; onReply: (message: Message) => void; onEdit: (message: Message) => void; onDelete: (messageId: number) => void; }> = ({ message, isSender, onReply, onEdit, onDelete }) => {
    const messageClasses = isSender
        ? 'bg-primary text-white self-end rounded-t-xl rounded-bl-xl'
        : 'bg-slate-200 text-text-heading self-start rounded-t-xl rounded-br-xl';
    
    const { replyInfo, mainContent } = parseReply(message.content);

    return (
        <div className={`group relative flex flex-col ${isSender ? 'items-end animate-slide-in-right' : 'items-start animate-slide-in-left'}`}>
            <div className={`max-w-xs md:max-w-md p-3 shadow-sm ${messageClasses}`}>
                {replyInfo && (
                    <div className={`border-l-2 pl-2 mb-2 opacity-80 ${isSender ? 'border-white/50' : 'border-primary/50'}`}>
                        <p className="font-bold text-xs">{replyInfo.senderName}</p>
                        <p className="text-xs truncate">{replyInfo.content}</p>
                    </div>
                )}
                {mainContent && <p className="whitespace-pre-wrap break-words">{mainContent}</p>}
                <FileMessageContent message={message} />
            </div>
             <p className={`text-xs text-text-muted mt-1 px-1`}>
                {format(new Date(message.created_at), 'p')}
            </p>
            <div className={`absolute top-0 flex gap-1 bg-white border rounded-full shadow-md p-1 transition-all duration-200 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 ${isSender ? 'left-0 -translate-x-full -ml-2 origin-left' : 'right-0 translate-x-full mr-2 origin-right'}`}>
                <button onClick={() => onReply(message)} className="p-1 rounded-full hover:bg-slate-200" title="Reply"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                {isSender && (
                    <>
                    <button onClick={() => onEdit(message)} className="p-1 rounded-full hover:bg-slate-200" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                    <button onClick={() => onDelete(message.id)} className="p-1 rounded-full hover:bg-slate-200" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                    </>
                )}
            </div>
        </div>
    );
};


const ChatPage: React.FC = () => {
    const { recipientId } = useParams<{ recipientId: string }>();
    const { user, profile: currentUserProfile } = useAuth();
    const location = useLocation();
    const prefilledMessage = location.state?.prefilledMessage;

    const [recipientProfile, setRecipientProfile] = useState<Profile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState(prefilledMessage || '');
    const [fileToSend, setFileToSend] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [isIcebreakerModalOpen, setIsIcebreakerModalOpen] = useState(false);
    const [isRecipientTyping, setIsRecipientTyping] = useState(false);
    
    const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingChannelRef = useRef<RealtimeChannel | null>(null);
    
    const { onlineUsers } = usePresence();
    const isRecipientOnline = recipientId ? onlineUsers.has(recipientId) : false;

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
        } catch (e) {
            console.error("Speech recognition not supported", e);
        }
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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (prefilledMessage) {
            window.history.replaceState({}, document.title);
        }
    }, [prefilledMessage]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isRecipientTyping]);
    
    const resetFileInput = () => {
        setFileToSend(null);
        setFilePreview(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if(file.size > 10 * 1024 * 1024) {
                alert("File is too large. Max size is 10MB.");
                resetFileInput();
                return;
            }
            setFileToSend(file);
            if (file.type.startsWith('image/')) {
                setFilePreview(URL.createObjectURL(file));
            } else {
                setFilePreview(file.name);
            }
        }
    };

    const markMessagesAsSeen = useCallback(async () => {
        if (!user || !recipientId || document.hidden) return;
        
        const { error } = await supabase
            .from('messages')
            .update({ is_seen: true })
            .eq('receiver_id', user.id)
            .eq('sender_id', recipientId)
            .eq('is_seen', false);

        if (error) {
            console.error('Error marking messages as seen:', error);
        }
    }, [user, recipientId]);

    const fetchChatData = useCallback(async () => {
        if (!recipientId || !user) return;
        setLoading(true);
        setError(null);
        
        try {
            const { data: recipientData, error: recipientError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', recipientId)
                .single();
            if (recipientError) throw recipientError;
            setRecipientProfile(recipientData);

            const { data: messagesData, error: messagesError } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`)
                .order('created_at', { ascending: true });

            if (messagesError) throw messagesError;
            setMessages(messagesData as Message[]);
            
        } catch (e: any) {
             setError(e.message.includes('0 rows') ? "User not found." : e.message);
        } finally {
            setLoading(false);
        }
    }, [recipientId, user]);
    
    useEffect(() => {
        fetchChatData();
    }, [fetchChatData]);
    
    useEffect(() => {
        markMessagesAsSeen();
        
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                markMessagesAsSeen();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [messages, markMessagesAsSeen]);

    useEffect(() => {
        if (!user || !recipientId) return;
        
        const messageChannelName = [user.id, recipientId].sort().join('-');
        const messageChannel = supabase
            .channel(`messages-chat-${messageChannelName}`)
            .on(
                'postgres_changes',
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'messages',
                    filter: `or=(and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id}))`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newMessage = payload.new as Message;
                        setMessages(currentMessages => {
                            if (currentMessages.some(m => m.id === newMessage.id)) {
                                return currentMessages;
                            }
                            if(newMessage.sender_id === recipientId) {
                                markMessagesAsSeen();
                            }
                            return [...currentMessages, newMessage];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages(currentMessages => 
                            currentMessages.map(m => m.id === (payload.new as Message).id ? (payload.new as Message) : m)
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setMessages(currentMessages => currentMessages.filter(m => m.id !== (payload.old as any).id));
                    }
                }
            )
            .subscribe();
        
        const typingChannelName = `typing-${[user.id, recipientId].sort().join('-')}`;
        const typingChannel = supabase.channel(typingChannelName, {
            config: { presence: { key: user.id } }
        });
        typingChannelRef.current = typingChannel;

        typingChannel.on('presence', { event: 'sync' }, () => {
            const presenceState = typingChannel.presenceState();
            const recipientPresence = presenceState[recipientId];
            if (recipientPresence && (recipientPresence[0] as any)?.is_typing) {
                setIsRecipientTyping(true);
            } else {
                setIsRecipientTyping(false);
            }
        });
        
        typingChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await typingChannel.track({ is_typing: false });
            }
        });

        return () => {
            supabase.removeChannel(messageChannel);
            supabase.removeChannel(typingChannel);
            typingChannelRef.current = null;
        };
    }, [recipientId, user, markMessagesAsSeen]);
    
    const handleTyping = (isTyping: boolean) => {
        if (typingChannelRef.current) {
            typingChannelRef.current.track({ is_typing: isTyping });
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        if (!typingTimeoutRef.current) {
            handleTyping(true);
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
            handleTyping(false);
            typingTimeoutRef.current = null;
        }, 2000);
    };

    const handleUpdateMessage = async (newContent: string) => {
        if (!editingMessage) return;
        setIsSending(true);

        const { replyInfo } = parseReply(editingMessage.content);
        let finalContent = newContent;
        if (replyInfo) {
            finalContent = formatReplyContent(replyInfo, newContent);
        }
        
        const { error } = await supabase.from('messages').update({ content: finalContent }).eq('id', editingMessage.id);
        if (error) {
            alert("Failed to update message: " + error.message);
        }
        
        setNewMessage('');
        setEditingMessage(null);
        setIsSending(false);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = newMessage.trim();
        if ((!content && !fileToSend) || !user || !recipientId) return;

        if (editingMessage) {
            handleUpdateMessage(content);
            return;
        }

        setIsSending(true);
        handleTyping(false);
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        
        try {
            let fileUrl: string | null = null;
            let fileType: string | null = null;
            let finalContent = content;

            if (replyingTo) {
                finalContent = formatReplyContent(replyingTo, content);
            }

            if (fileToSend) {
                const filePath = `${user.id}/${recipientId}/${Date.now()}_${fileToSend.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, fileToSend);
                if (uploadError) throw new Error(`Failed to upload file. ${uploadError.message}`);
                if (!uploadData?.path) throw new Error("File upload failed: path not returned.");
                fileUrl = uploadData.path;
                fileType = fileToSend.type;
            }
            
            const { data: insertedMessage, error: insertError } = await supabase.from('messages').insert({
                sender_id: user.id,
                receiver_id: recipientId,
                content: finalContent,
                file_url: fileUrl,
                file_type: fileType,
            }).select().single();

            if (insertError) throw insertError;

            if (insertedMessage) {
                setMessages(current => [...current, insertedMessage as Message]);
            }

            await supabase.from('notifications').insert({
                user_id: recipientId,
                actor_id: user.id,
                type: 'new_message',
                entity_id: user.id,
            });
            
            setNewMessage('');
            resetFileInput();
            setReplyingTo(null);
        } catch (err: any) {
            console.error('Error sending message:', err);
            alert(`Failed to send message: ${err.message}`);
        } finally {
            setIsSending(false);
        }
    };
    
    const handleDeleteMessage = async (messageId: number) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;
        await supabase.from('messages').delete().eq('id', messageId);
    };

    const handleSelectIcebreaker = (question: string) => {
        setNewMessage(question);
        setIsIcebreakerModalOpen(false);
    };

    if (loading) return <div className="flex h-full items-center justify-center"><Spinner size="lg" /></div>;
    if (error) return <p className="text-center text-red-500 p-8">{error}</p>;
    if (!recipientProfile) return <p className="text-center text-gray-500 p-8">Could not load user profile.</p>;

    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const isLastMessageSeen = lastMessage && lastMessage.sender_id === user?.id && lastMessage.is_seen;
    
    const getStatusText = () => {
        if (isRecipientTyping) return 'typing...';
        if (isRecipientOnline) return 'Online';
        if (recipientProfile.last_seen) return `Last seen ${formatDistanceToNowStrict(new Date(recipientProfile.last_seen))} ago`;
        return 'Offline';
    }

    return (
        <div className="flex flex-col h-full max-w-3xl mx-auto bg-card sm:rounded-2xl shadow-soft sm:border border-slate-200/50">
            <header className="p-4 border-b border-slate-200 flex items-center gap-3">
                <Link to="/chat" className="p-2 -ml-2 text-text-muted hover:text-primary rounded-full transition-colors" aria-label="Back to messages"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></Link>
                <Link to={`/profile/${recipientProfile.id}`}><img src={recipientProfile.avatar_url || `https://avatar.vercel.sh/${recipientProfile.id}.png`} alt={recipientProfile.name || ''} className="w-10 h-10 rounded-full object-cover" /></Link>
                <div>
                     <div className="flex items-center gap-2">
                        <Link to={`/profile/${recipientProfile.id}`} className="font-bold text-text-heading hover:underline">{recipientProfile.name}</Link>
                        {recipientProfile.is_verified && <VerifiedBadge />}
                        <div className={`h-2.5 w-2.5 rounded-full transition-colors ${isRecipientOnline ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                     </div>
                     <p className="text-xs text-text-muted h-4">{getStatusText()}</p>
                </div>
            </header>

            <main className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map(msg => (
                    <ChatMessage 
                        key={msg.id} 
                        message={msg} 
                        isSender={msg.sender_id === user?.id} 
                        onReply={(m) => { 
                            setReplyingTo({ id: m.id, content: parseReply(m.content).mainContent, senderId: m.sender_id, senderName: m.sender_id === user?.id ? 'You' : recipientProfile.name || '' });
                            setEditingMessage(null);
                        }} 
                        onEdit={(m) => {
                            setEditingMessage(m);
                            setReplyingTo(null);
                        }}
                        onDelete={handleDeleteMessage} 
                    />
                ))}
                {isRecipientTyping && (<div className="flex items-start gap-2 animate-fade-in-up" style={{ animationDuration: '0.3s' }}><div className="bg-slate-200 text-text-heading self-start rounded-t-xl rounded-br-xl p-3"><div className="flex items-center gap-1.5"><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span></div></div></div>)}
                {isLastMessageSeen && (<p className="text-right text-xs text-text-muted pr-1">Seen</p>)}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 border-t border-slate-200 space-y-2">
                 {(replyingTo || editingMessage) && (
                    <div className="p-2 bg-slate-100 rounded-lg flex items-center justify-between text-sm animate-fade-in-up" style={{animationDuration: '0.3s'}}>
                        <div>
                            <p className="font-bold text-primary">{editingMessage ? 'Editing Message' : `Replying to ${replyingTo?.senderName}`}</p>
                            <p className="text-text-body truncate max-w-xs">{editingMessage ? parseReply(editingMessage.content).mainContent : replyingTo?.content}</p>
                        </div>
                        <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setNewMessage(''); }} className="p-1.5 rounded-full hover:bg-slate-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                 )}
                 {fileToSend && (
                    <div className="p-2 bg-slate-100 rounded-lg flex items-center justify-between">
                        {filePreview && fileToSend.type.startsWith('image/') ? (<img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded-md" />) : (<div className="flex items-center gap-2 text-sm text-text-body"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span className="truncate max-w-xs">{filePreview}</span></div>)}
                        <button onClick={resetFileInput} className="p-1.5 rounded-full hover:bg-slate-200 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative">
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="text-text-muted hover:text-primary transition-all p-3 rounded-lg flex-shrink-0 transform hover:scale-110 active:scale-95"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg><input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" /></button>
                    {recognitionRef.current && (
                        <button type="button" onClick={toggleListening} className={`text-text-muted hover:text-primary transition-all p-3 rounded-lg flex-shrink-0 ${isListening ? 'text-red-500 animate-pulse' : ''} transform hover:scale-110 active:scale-95`} title="Voice message"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button>
                    )}
                    <input type="text" value={newMessage} onChange={handleInputChange} placeholder="Type a message..." className="w-full p-3 pr-24 bg-slate-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-colors" disabled={isSending} />
                     <button type="button" onClick={() => setIsIcebreakerModalOpen(true)} className="absolute right-20 top-1/2 -translate-y-1/2 text-text-muted hover:text-secondary transition-all p-2 rounded-full transform hover:scale-110 active:scale-95" title="Generate AI Icebreaker"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></button>
                     <button type="submit" disabled={isSending || (!newMessage.trim() && !fileToSend)} className="text-white bg-primary disabled:bg-slate-400 hover:bg-primary-focus transition-all hover:scale-105 active:scale-95 rounded-lg p-3 flex-shrink-0">{isSending ? <Spinner size="sm" /> : editingMessage ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}</button>
                </form>
            </footer>
            {isIcebreakerModalOpen && currentUserProfile && recipientProfile && (
                <IcebreakerModal
                    currentUser={currentUserProfile}
                    targetUser={recipientProfile}
                    onClose={() => setIsIcebreakerModalOpen(false)}
                    onSelectQuestion={handleSelectIcebreaker}
                />
            )}
        </div>
    );
};

export default ChatPage;
