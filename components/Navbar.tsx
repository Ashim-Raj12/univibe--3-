import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { NotificationWithActor, Message, Profile, Notification } from '../types';
import { formatDistanceToNow } from 'date-fns';
import Spinner from './Spinner';
import VerifiedBadge from './VerifiedBadge';

const UniVibeLogo: React.FC = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary w-8 h-8">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 12C22 9.24 19.76 7 17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 17C19.76 17 22 14.76 22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const ProfileDropdown: React.FC<{ direction?: 'up' | 'down' }> = ({ direction = 'up' }) => {
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const dropdownClasses = `absolute w-full bg-card rounded-xl shadow-lg border border-slate-200 py-1.5 z-10 ${
        direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
    }`;
    
    return (
         <div ref={ref} className="relative">
            <button onClick={() => setIsOpen(p => !p)} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 w-full text-left transition-colors">
                 <img
                    src={profile?.avatar_url || `https://avatar.vercel.sh/${user?.id}.png?text=UV`}
                    alt={profile?.name || ''}
                    className="h-10 w-10 rounded-full object-cover"
                />
                <div className="flex-1 truncate">
                    <p className="font-bold text-sm text-text-heading truncate flex items-center gap-1">
                        <span className="truncate">{profile?.name}</span>
                        {profile?.is_verified && <VerifiedBadge size="h-4 w-4" />}
                    </p>
                    <p className="text-xs text-text-muted truncate">@{profile?.username}</p>
                </div>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
             {isOpen && (
                <div className={dropdownClasses}>
                    <Link to={`/profile/${user?.id}`} onClick={() => setIsOpen(false)} className="block w-full text-left px-4 py-2 text-sm text-text-body hover:bg-slate-100">My Profile</Link>
                    <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        Sign Out
                    </button>
                </div>
            )}
        </div>
    )
};

interface ToastNotification {
    title: string;
    message: string;
    avatar: string;
    link: string;
    isVerified?: boolean;
}

const Navbar: React.FC = () => {
    const { user, profile, refetchProfile } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessageCount, setUnreadMessageCount] = useState(0);
    const [isNotificationLoading, setIsNotificationLoading] = useState(true);
    const [isClearing, setIsClearing] = useState(false);
    const [toast, setToast] = useState<ToastNotification | null>(null);
    const mobileNotificationButtonRef = useRef<HTMLDivElement>(null);
    const desktopNotificationButtonRef = useRef<HTMLDivElement>(null);
    
    const adminEmails = ['sumitkumar050921@gmail.com', 'admin.univibe@example.com'];
    const isAdmin = user?.email ? adminEmails.includes(user.email) : false;

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setIsNotificationLoading(true);
        const { data, error, count } = await supabase
            .from('notifications')
            .select('*, profiles:actor_id(id, name, avatar_url, username, is_verified)', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (data) {
            const notificationsData = data as NotificationWithActor[];
            setNotifications(notificationsData);
            setUnreadCount(count ?? 0);
        }
        
        setIsNotificationLoading(false);
    }, [user]);
    
    const fetchUnreadMessageCount = useCallback(async () => {
        if (!user) return;
        const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', user.id)
            .eq('is_seen', false);
        setUnreadMessageCount(count ?? 0);
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        fetchUnreadMessageCount();
    }, [fetchNotifications, fetchUnreadMessageCount]);

    useEffect(() => {
        if (!user) return;
        
        const notificationsChannel = supabase
            .channel(`notifications-channel-${user.id}`)
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                async (payload) => {
                    const newNotification = payload.new as Notification;

                    // If verification status changes, refetch profile to update UI (e.g., access to verified routes)
                    if (newNotification.type === 'verification_approved' || newNotification.type === 'verification_rejected') {
                        refetchProfile();
                    }

                    // Always refetch the list for consistency. This also handles updating the unread count.
                    fetchNotifications();

                    // The rest of this function is just for showing the toast notification.
                    const toastableTypes: Notification['type'][] = ['new_follower', 'new_comment', 'new_like', 'group_invite'];
                    if (!toastableTypes.includes(newNotification.type) || !newNotification.actor_id) {
                        return;
                    }

                    // We still need to fetch the actor's profile to display the toast.
                    const { data: actorProfile } = await supabase
                        .from('profiles')
                        .select('id, name, avatar_url, is_verified')
                        .eq('id', newNotification.actor_id)
                        .single();

                    if (actorProfile) {
                        let toastMessage = '';
                        let toastLink = '#';

                        switch(newNotification.type) {
                            case 'new_follower':
                                toastMessage = 'Started following you.';
                                toastLink = `/profile/${actorProfile.id}`;
                                break;
                            case 'new_comment':
                                toastMessage = 'Commented on your post.';
                                toastLink = `/post/${newNotification.entity_id}`;
                                break;
                            case 'new_like':
                                toastMessage = 'Liked your post.';
                                toastLink = `/post/${newNotification.entity_id}`;
                                break;
                            case 'group_invite':
                                const groupName = (newNotification.metadata as any)?.group_name || 'a group';
                                toastMessage = `Invited you to join ${groupName}.`;
                                toastLink = `/notifications`; // Or a dedicated invites page
                                break;
                            default:
                                return;
                        }
                        
                        setToast({
                            title: actorProfile.name,
                            message: toastMessage,
                            avatar: actorProfile.avatar_url || `https://avatar.vercel.sh/${actorProfile.id}.png?text=UV`,
                            link: toastLink,
                            isVerified: actorProfile.is_verified,
                        });
                        setTimeout(() => setToast(null), 5000);
                    }
                }
            )
            .subscribe();
        
        const followsChannel = supabase
            .channel(`follows-channel-${user.id}`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'follows' },
                () => {
                    // This could trigger a refetch of follower counts if needed in the UI
                }
            )
            .subscribe();
        
        const incomingMessagesChannel = supabase
            .channel(`incoming-messages-for-${user.id}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
                async (payload) => {
                    fetchUnreadMessageCount();
                    
                    const newMessage = payload.new as Message;
                    const { data: senderProfile } = await supabase
                        .from('profiles')
                        .select('id, name, avatar_url, is_verified')
                        .eq('id', newMessage.sender_id)
                        .single();
                    
                    if (senderProfile) {
                        setToast({
                            title: senderProfile.name,
                            message: newMessage.content || 'Sent a file',
                            avatar: senderProfile.avatar_url || `https://avatar.vercel.sh/${senderProfile.id}.png?text=UV`,
                            link: `/chat/${senderProfile.id}`,
                            isVerified: senderProfile.is_verified,
                        });
                        setTimeout(() => setToast(null), 5000);
                    }
                }
            ).subscribe();

        const messagesUpdateChannel = supabase
            .channel(`messages-update-for-${user.id}`)
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
                () => {
                    fetchUnreadMessageCount();
                }
            ).subscribe();

        return () => { 
            supabase.removeChannel(notificationsChannel);
            supabase.removeChannel(followsChannel);
            supabase.removeChannel(incomingMessagesChannel);
            supabase.removeChannel(messagesUpdateChannel);
        };
    }, [user, fetchNotifications, fetchUnreadMessageCount, refetchProfile]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                mobileNotificationButtonRef.current &&
                !mobileNotificationButtonRef.current.contains(event.target as Node) &&
                desktopNotificationButtonRef.current &&
                !desktopNotificationButtonRef.current.contains(event.target as Node)
            ) {
                setIsNotificationOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDismissNotification = async (notificationId: number) => {
        if (!user) return;

        const originalNotifications = [...notifications];
        
        // Optimistic update
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setUnreadCount(prev => prev - 1);

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);
        
        if (error) {
            console.error(`Failed to dismiss notification ${notificationId}:`, error);
            alert("Sorry, we couldn't clear that notification. Please try again.");
            // Revert on error
            setNotifications(originalNotifications);
            setUnreadCount(originalNotifications.length);
        }
    };
    
    const handleDismissAll = async () => {
        if (!user || unreadCount === 0 || isClearing) return;
    
        setIsClearing(true);
        const originalNotifications = [...notifications];
        
        // Optimistic update
        setNotifications([]);
        setUnreadCount(0);
    
        const unreadIds = originalNotifications.map(n => n.id);

        const { error } = await supabase
            .from('notifications')
            .delete()
            .in('id', unreadIds);
        
        if (error) {
            console.error("Failed to dismiss all notifications:", error);
            alert("Sorry, we couldn't clear your notifications. Please try again.");
            // Revert UI on failure
            setNotifications(originalNotifications);
            setUnreadCount(originalNotifications.length);
        }
        setIsClearing(false);
    }

    const handleNotificationToggle = () => {
        setIsNotificationOpen(p => !p);
    };

    const handleNotificationClick = (notification: NotificationWithActor, link: string) => {
        handleDismissNotification(notification.id);
        setIsNotificationOpen(false);
        navigate(link);
    };
    
    const handleAcceptInvite = async (e: React.MouseEvent, notification: NotificationWithActor) => {
        e.stopPropagation();
        const inviteId = notification.entity_id;
        if (!inviteId) return;

        const { data: groupId, error } = await supabase.rpc('accept_study_group_invite', { p_invite_id: parseInt(inviteId) });
        if (error) {
            alert('Failed to accept invite: ' + error.message);
        } else {
            handleDismissNotification(notification.id);
            setIsNotificationOpen(false);
            if (groupId) {
                navigate(`/group/${groupId}`);
            }
        }
    };

    const handleDeclineInvite = async (e: React.MouseEvent, notification: NotificationWithActor) => {
        e.stopPropagation();
        const inviteId = notification.entity_id;
        if (!inviteId) return;
        
        await supabase.from('study_group_invites').update({ status: 'declined' }).eq('id', inviteId);
        handleDismissNotification(notification.id);
    };

    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full ${
            isActive
                ? 'bg-primary/10 text-primary'
                : 'text-text-heading hover:bg-slate-100'
        }`;

    const renderNavLinks = (isMobile = false) => {
        const isParent = profile?.enrollment_status === 'parent';

        if (isParent) {
            return (
                 <nav className={`items-start gap-1 ${isMobile ? 'flex flex-col w-full' : 'flex flex-col'}`}>
                    <NavLink to="/common-room" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Common Room</NavLink>
                    <hr className="my-3 border-slate-200/60" />
                    <NavLink to="/chat" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>
                        Messages
                        {unreadMessageCount > 0 && <span className="ml-auto inline-block py-0.5 px-2.5 leading-none text-center whitespace-nowrap align-baseline font-bold bg-primary text-white rounded-full text-xs">{unreadMessageCount}</span>}
                    </NavLink>
                    <NavLink to="/about" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>About Us</NavLink>
                    <NavLink to="/feedback" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Feedback</NavLink>
                </nav>
            );
        }

        return (
            <nav className={`items-start gap-1 ${isMobile ? 'flex flex-col w-full' : 'flex flex-col'}`}>
                {/* Main */}
                <NavLink to="/home" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Home</NavLink>
                
                <hr className="my-3 border-slate-200/60" />

                {/* Discovery */}
                <NavLink to="/find-fellows" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Find Fellows</NavLink>
                <NavLink to="/suggestions" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Suggestions</NavLink>
                <NavLink to={`/friends?userId=${user?.id}`} className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>My Network</NavLink>
                <NavLink to="/feedback" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Feedback</NavLink>

                <hr className="my-3 border-slate-200/60" />

                {/* Campus Life */}
                <NavLink to="/communities" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Communities</NavLink>
                {profile?.is_verified && (
                    <>
                        <NavLink to="/college-hub" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>
                            <span className="truncate">{profile?.college || 'College Hub'}</span>
                        </NavLink>
                        <NavLink to="/study-hub" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Study Hub</NavLink>
                        <NavLink to="/events" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Events</NavLink>
                    </>
                )}
                
                <hr className="my-3 border-slate-200/60" />

                {/* Comms & Info */}
                <NavLink to="/chat" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>
                    Messages
                    {unreadMessageCount > 0 && <span className="ml-auto inline-block py-0.5 px-2.5 leading-none text-center whitespace-nowrap align-baseline font-bold bg-primary text-white rounded-full text-xs">{unreadMessageCount}</span>}
                </NavLink>
                <NavLink to="/about" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>About Us</NavLink>
                
                {isAdmin && (
                    <>
                        <hr className="my-3 border-slate-200/60" />
                        <NavLink to="/admin/dashboard" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Admin Panel</NavLink>
                    </>
                )}
            </nav>
        );
    }
    
    const renderNotificationContent = () => {
        if (isNotificationLoading) return <div className="flex justify-center p-4"><Spinner /></div>;
        if (notifications.length === 0) return <p className="text-center text-sm text-text-muted p-4">No unread notifications.</p>;

        const notificationItems = notifications.slice(0, 10).map(n => {
            let content: React.ReactNode;
            let link = '#';
            let actions: React.ReactNode = null;
            const actorProfile = n.profiles;
            const actorNameWithBadge = (
                <span className="inline-flex items-center gap-1.5">
                    <strong className="font-semibold">{actorProfile?.name}</strong>
                    {actorProfile?.is_verified && <VerifiedBadge size="h-4 w-4" />}
                </span>
            );

            switch(n.type) {
                case 'group_invite':
                    const groupName = (n.metadata as any)?.group_name || 'a study group';
                    content = <>{actorNameWithBadge} invited you to join <strong className="font-semibold">{groupName}</strong>.</>;
                    actions = (
                        <div className="flex gap-2 mt-2">
                            <button onClick={(e) => handleAcceptInvite(e, n)} className="bg-primary text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-primary-focus">Accept</button>
                            <button onClick={(e) => handleDeclineInvite(e, n)} className="bg-slate-200 text-text-body text-xs font-bold py-1 px-3 rounded-md hover:bg-slate-300">Decline</button>
                        </div>
                    );
                    break;
                case 'new_follower':
                    content = <>{actorNameWithBadge} started following you.</>;
                    link = `/profile/${actorProfile?.id}`;
                    break;
                case 'new_comment':
                    content = <>{actorNameWithBadge} commented on your post.</>;
                    link = `/post/${n.entity_id}`;
                    break;
                case 'new_like':
                    content = <>{actorNameWithBadge} liked your post.</>;
                    link = `/post/${n.entity_id}`;
                    break;
                case 'new_message':
                    content = <>{actorNameWithBadge} sent you a message.</>;
                    link = `/chat/${actorProfile?.id}`;
                    break;
                case 'verification_approved':
                    content = <>Your student ID submission has been <strong className="text-green-600">approved!</strong> You're now verified.</>;
                    link = `/profile/${user?.id}`;
                    break;
                case 'verification_rejected':
                    content = <>Your student ID submission was <strong className="text-red-600">rejected</strong>. Check your profile for details.</>;
                    link = `/profile/${user?.id}`;
                    break;
                default: 
                    content = <>{actorNameWithBadge} did something.</>;
            }

            return (
                <div
                    key={n.id}
                    onClick={() => actions ? null : handleNotificationClick(n, link)}
                    className={`relative block p-3 pl-5 transition-colors ${actions ? '' : 'cursor-pointer hover:bg-slate-50'} bg-blue-50/50`}
                >
                    <span className="absolute left-1.5 top-4 h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                    <div className="flex items-start gap-3">
                        <img
                            src={actorProfile?.avatar_url || `https://avatar.vercel.sh/${actorProfile?.id}.png?text=UV`}
                            alt={actorProfile?.name || 'User'}
                            className="h-8 w-8 rounded-full object-cover"
                        />
                        <div className="flex-1">
                            <p className="text-sm text-text-body whitespace-pre-wrap">{content}</p>
                            <p className="text-xs text-text-muted mt-0.5">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </p>
                            {actions}
                        </div>
                    </div>
                </div>
            );
        });

        return (
            <>
                <div className="divide-y divide-slate-100">{notificationItems}</div>
            </>
        );
    };
    
    return (
    <>
        {/* Mobile Navbar */}
        <header className="md:hidden bg-card border-b border-slate-200/80 p-4 flex justify-between items-center sticky top-0 z-30">
            <Link to="/home" className="flex items-center gap-2 font-bold text-xl text-text-heading">
                <UniVibeLogo />
                <span>UniVibe</span>
            </Link>
            <div className="flex items-center gap-1">
                 <div ref={mobileNotificationButtonRef} className="relative">
                    <button onClick={handleNotificationToggle} className="relative p-2 rounded-full hover:bg-slate-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-body" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white"></span>
                        )}
                    </button>
                    {isNotificationOpen && (
                        <div className="absolute top-full mt-2 w-[95vw] max-w-xs bg-card rounded-xl shadow-lg border border-slate-200 overflow-hidden right-0 z-50">
                            <div className="flex justify-between items-center p-3 border-b text-text-heading">
                                <span className="font-bold">Notifications</span>
                                {unreadCount > 0 && (
                                    <button onClick={handleDismissAll} disabled={isClearing} className="text-sm font-semibold text-primary hover:underline disabled:text-text-muted">
                                        {isClearing ? <Spinner size="sm"/> : 'Clear all'}
                                    </button>
                                )}
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {renderNotificationContent()}
                            </div>
                        </div>
                    )}
                </div>
                 <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-text-body">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                </button>
            </div>
        </header>

        {/* Mobile Menu Panel */}
        {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="bg-background w-72 h-full p-4 shadow-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="self-end p-2 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="mb-4">
                        <ProfileDropdown direction="down" />
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {renderNavLinks(true)}
                    </div>
                </div>
            </div>
        )}
        
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 bg-card border-r border-slate-200/80 p-5 z-40">
            <div className="py-4 mb-4">
                <Link to="/home" className="flex items-center gap-2 font-bold text-xl text-text-heading">
                    <UniVibeLogo />
                    <span>UniVibe</span>
                </Link>
            </div>
            <div className="flex-grow overflow-y-auto">
                {renderNavLinks()}
            </div>
            <div className="space-y-2 pt-4 border-t border-slate-200/60">
                <div ref={desktopNotificationButtonRef} className="relative">
                     <button onClick={handleNotificationToggle} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-text-heading hover:bg-slate-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        <span>Notifications</span>
                        {unreadCount > 0 && <span className="ml-auto inline-block py-0.5 px-2.5 leading-none text-center whitespace-nowrap align-baseline font-bold bg-primary text-white rounded-full text-xs">{unreadCount}</span>}
                    </button>
                    {isNotificationOpen && (
                         <div className="absolute bottom-0 left-full ml-2 w-[400px] bg-card rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
                            <div className="flex justify-between items-center p-3 border-b text-text-heading">
                                <span className="font-bold">Notifications</span>
                                {unreadCount > 0 && (
                                    <button onClick={handleDismissAll} disabled={isClearing} className="text-sm font-semibold text-primary hover:underline disabled:text-text-muted">
                                        {isClearing ? <Spinner size="sm"/> : 'Clear all'}
                                    </button>
                                )}
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {renderNotificationContent()}
                            </div>
                        </div>
                    )}
                </div>
                <ProfileDropdown />
            </div>
        </aside>

        {/* Message Toast Notification */}
        {toast && (
            <div className="fixed bottom-5 right-5 w-80 bg-card rounded-xl shadow-soft-lg p-4 border border-slate-200 z-50 animate-fade-in-up">
                <div className="flex items-start gap-3">
                    <img src={toast.avatar} alt={toast.title} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                    <div className="flex-1 overflow-hidden">
                        <Link to={toast.link} className="inline-flex items-center gap-1 font-bold text-text-heading hover:underline text-sm" onClick={() => setToast(null)}>
                            <span>{toast.title}</span>
                            {toast.isVerified && <VerifiedBadge size="h-4 w-4" />}
                        </Link>
                        <p className="text-sm text-text-body mt-1 truncate">{toast.message}</p>
                    </div>
                    <button onClick={() => setToast(null)} className="text-text-muted hover:text-text-heading p-1 -mt-1 -mr-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
        )}
    </>
    )
};

export default Navbar;