import React, { useState, useEffect } from 'react';
import { EventWithCreatorAndAttendees } from '../types';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import Spinner from './Spinner';
import MagicCard from './MagicCard';

interface EventCardProps {
    event: EventWithCreatorAndAttendees;
    onRsvpChange?: () => void; // Optional callback
}

const EventCard: React.FC<EventCardProps> = ({ event, onRsvpChange }) => {
    const { user } = useAuth();
    const isCreator = event.creator_id === user?.id;

    // State for optimistic UI updates
    const [isAttending, setIsAttending] = useState(event.event_attendees.some(a => a.user_id === user?.id));
    const [attendees, setAttendees] = useState(event.event_attendees);
    const [isRsvpLoading, setIsRsvpLoading] = useState(false);
    
    // Ensure state is updated if the parent component re-renders with new props
    useEffect(() => {
        setIsAttending(event.event_attendees.some(a => a.user_id === user?.id));
        setAttendees(event.event_attendees);
    }, [event.event_attendees, user?.id]);


    const handleRsvpToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user || isCreator || isRsvpLoading) return;

        setIsRsvpLoading(true);
        const currentlyAttending = isAttending;

        // Optimistic update
        setIsAttending(!currentlyAttending);
        if (!currentlyAttending) {
            // Add self to attendees preview
            const selfAttendee = { user_id: user.id, profiles: { id: user.id, name: 'You', avatar_url: null } };
            setAttendees(prev => [...prev, selfAttendee]);
        } else {
            // Remove self from attendees preview
            setAttendees(prev => prev.filter(a => a.user_id !== user.id));
        }

        try {
            if (currentlyAttending) {
                const { error } = await supabase
                    .from('event_attendees')
                    .delete()
                    .match({ event_id: event.id, user_id: user.id });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('event_attendees')
                    .insert({ event_id: event.id, user_id: user.id });
                if (error) throw error;
            }
            if (onRsvpChange) onRsvpChange();
        } catch (error) {
            console.error("Failed to update RSVP", error);
            // Revert on error
            setIsAttending(currentlyAttending);
            setAttendees(event.event_attendees);
            alert("There was an error updating your RSVP. Please try again.");
        } finally {
            setIsRsvpLoading(false);
        }
    };

    const isEventFull = event.rsvp_limit !== null && attendees.length >= event.rsvp_limit;
    const spotsLeft = event.rsvp_limit !== null ? event.rsvp_limit - attendees.length : 0;

    const rsvpButtonClasses = `px-4 py-2 rounded-xl transition-all duration-300 font-semibold text-sm disabled:opacity-50 shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5 active:scale-95 min-w-[90px] text-center
        ${isAttending ? 'bg-slate-100 text-text-body hover:bg-slate-200' : 'bg-primary text-white hover:bg-primary-focus'}`;

    return (
        <MagicCard>
            <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden group transition-all duration-300 flex flex-col h-full">
                <Link to={`/event/${event.id}`} className="block">
                    <div className="h-32 bg-slate-200 overflow-hidden">
                        <img 
                            src={event.banner_url || `https://placehold.co/600x400/e2e8f0/e2e8f0`} 
                            alt={`${event.name} banner`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>
                    <div className="p-4">
                        <p className="text-sm font-semibold text-primary uppercase">
                            {format(new Date(event.event_date), 'EEE, MMM d')} &bull; {format(new Date(event.event_date), 'p')}
                            {event.rsvp_limit !== null && (
                                <span className={`ml-2 font-bold ${spotsLeft > 5 ? 'text-green-600' : spotsLeft > 0 ? 'text-orange-500' : 'text-red-600'}`}>
                                    {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
                                </span>
                            )}
                        </p>
                        <h3 className="font-bold text-lg text-text-heading truncate mt-1 group-hover:text-primary transition-colors">{event.name}</h3>
                        <div className="text-sm text-text-body mt-2 flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="truncate">{event.location}</span>
                        </div>
                    </div>
                </Link>
                <div className="flex items-center justify-between mt-auto pt-3 pb-4 px-4 border-t border-slate-200/60">
                    <div className="flex items-center">
                        <div className="flex -space-x-2">
                            {attendees.slice(0, 3).map(attendee => (
                                <img
                                    key={attendee.user_id}
                                    src={attendee.profiles.avatar_url || `https://avatar.vercel.sh/${attendee.user_id}.png?text=${attendee.profiles.name[0]}`}
                                    alt={attendee.profiles.name}
                                    title={attendee.profiles.name}
                                    className="w-8 h-8 rounded-full object-cover border-2 border-white"
                                />
                            ))}
                        </div>
                        {attendees.length > 0 && <p className="text-sm font-semibold text-text-muted ml-3">{attendees.length} going</p>}
                    </div>
                    {!isCreator && (
                        <button onClick={handleRsvpToggle} disabled={isRsvpLoading || (isEventFull && !isAttending)} className={rsvpButtonClasses}>
                            {isRsvpLoading ? <Spinner size="sm" /> : (isAttending ? 'Going' : (isEventFull ? 'Full' : 'Attend'))}
                        </button>
                    )}
                </div>
            </div>
        </MagicCard>
    );
};

export default EventCard;