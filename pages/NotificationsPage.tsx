import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { NotificationWithActor } from '../types';
import Spinner from '../components/Spinner';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const NotificationItem: React.FC<{
    notification: NotificationWithActor;
    onNotificationClick: (notification: NotificationWithActor, link: string) => void;
}> = ({ notification, onNotificationClick }) => {
    const { user } = useAuth();
    let content: React.ReactNode;
    let link = '#';
    const actorProfile = notification.profiles;

    switch(notification.type) {
        case 'new_follower':
            content = <><strong>{actorProfile?.name}</strong> started following you.</>;
            link = `/profile/${actorProfile?.id}`;
            break;
        case 'new_comment':
            content = <><strong>{actorProfile?.name}</strong> commented on your post.</>;
            link = `/post/${notification.entity_id}`;
            break;
        case 'new_like':
            content = <><strong>{actorProfile?.name}</strong> liked your post.</>;
            link = `/post/${notification.entity_id}`;
            break;
        case 'new_message':
            content = <><strong>{actorProfile?.name}</strong> sent you a message.</>;
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
            content = <><strong>{actorProfile?.name}</strong> did something.</>;
    }

    return (
        <div
            onClick={() => onNotificationClick(notification, link)}
            className={`flex items-start gap-4 p-4 cursor-pointer transition-colors ${
                notification.is_read ? 'hover:bg-slate-50' : 'bg-blue-50 hover:bg-blue-100'
            }`}
        >
            <img
                src={actorProfile?.avatar_url || `https://avatar.vercel.sh/${actorProfile?.id}.png?text=UV`}
                alt={actorProfile?.name || 'User'}
                className="h-10 w-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1">
                <p className="text-sm text-text-body">{content}</p>
                <p className="text-xs text-text-muted mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
            </div>
            {!notification.is_read && <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1 flex-shrink-0"></div>}
        </div>
    );
};

// Note: This page is not currently linked in the main navbar, but is kept for potential future use.
// The notification pop-up in the Navbar is the primary notification interface.
const NotificationsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('notifications')
            .select('*, profiles:actor_id(id, name, avatar_url, username)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100);

        if (data) {
            setNotifications(data as NotificationWithActor[]);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);
    
    const handleNotificationClick = async (notification: NotificationWithActor, link: string) => {
        if (!notification.is_read) {
            await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
        }
        navigate(link);
    };

    const handleMarkAllAsRead = async () => {
        if (!user) return;
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length === 0) return;
        
        setNotifications(prev => prev.map(n => ({...n, is_read: true })));
        
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', unreadIds);
        
        if (error) {
            alert('Could not mark all as read. Please try again.');
            fetchNotifications(); // Revert on error
        }
    };
    
    const hasUnread = notifications.some(n => !n.is_read);

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-heading">Notifications</h1>
                {hasUnread && (
                    <button onClick={handleMarkAllAsRead} className="text-sm font-semibold text-primary hover:underline">
                        Mark all as read
                    </button>
                )}
            </div>
            <div className="bg-card rounded-lg shadow-sm border border-slate-200/80 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center p-8"><Spinner size="lg" /></div>
                ) : notifications.length === 0 ? (
                    <p className="text-center text-gray-500 p-8">You have no notifications.</p>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {notifications.map(n => (
                            <NotificationItem key={n.id} notification={n} onNotificationClick={handleNotificationClick} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
