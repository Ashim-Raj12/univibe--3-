import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { EventWithCreatorAndAttendees } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import { format } from 'date-fns';

const EventPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [event, setEvent] = useState<EventWithCreatorAndAttendees | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRsvpLoading, setIsRsvpLoading] = useState(false);

    const fetchEvent = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const eventId = parseInt(id, 10);
            if (isNaN(eventId)) throw new Error("Invalid event ID.");

            const { data, error } = await supabase
                .from('events')
                .select('*, profiles:creator_id(*), event_attendees(user_id, profiles(id, name, avatar_url))')
                .eq('id', eventId)
                .single();

            if (error) throw error;
            setEvent(data as any);
        } catch (e: any) {
            setError(e.message.includes('0 rows') ? "Event not found." : e.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchEvent();
    }, [fetchEvent]);

    const handleRsvpToggle = async () => {
        if (!user || !event || isRsvpLoading) return;
        setIsRsvpLoading(true);

        const isUserCurrentlyAttending = event.event_attendees.some(a => a.user_id === user.id);

        if (isUserCurrentlyAttending) {
            const { error } = await supabase
                .from('event_attendees')
                .delete()
                .match({ event_id: event.id, user_id: user.id });
            if (error) {
                alert('Failed to update RSVP.');
            } else {
                fetchEvent();
            }
        } else {
            const { error } = await supabase
                .from('event_attendees')
                .insert({ event_id: event.id, user_id: user.id });
            if (error) {
                alert('Failed to update RSVP.');
            } else {
                fetchEvent();
            }
        }
        setIsRsvpLoading(false);
    };

    const handleDelete = async () => {
        if (!event || event.creator_id !== user?.id || !window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
        
        // Delete banner image if it exists
        if (event.banner_url) {
            const path = event.banner_url.split('/event-banners/')[1];
            if(path) await supabase.storage.from('event-banners').remove([path]);
        }

        const { error } = await supabase.from('events').delete().eq('id', event.id);
        if (error) {
            alert('Failed to delete event.');
        } else {
            navigate('/events');
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    if (error) return <p className="text-center text-red-500 p-8">{error}</p>;
    if (!event) return <p className="text-center text-gray-500 p-8">Could not load event.</p>;

    const isUserAttending = event.event_attendees.some(a => a.user_id === user?.id);
    const isCreator = event.creator_id === user?.id;
    const isEventFull = event.rsvp_limit !== null && event.event_attendees.length >= event.rsvp_limit;

    const rsvpButtonClasses = `w-full sm:w-auto px-6 py-3 rounded-xl transition-all duration-300 font-semibold text-base disabled:opacity-50 shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5 active:scale-95
        ${isUserAttending ? 'bg-slate-100 text-text-body hover:bg-slate-200' : 'bg-primary text-white hover:bg-primary-focus'}`;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden">
                <img src={event.banner_url || `https://placehold.co/1200x400/e2e8f0/e2e8f0`} alt={`${event.name} banner`} className="w-full h-48 md:h-64 object-cover bg-slate-200" />
                <div className="p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-text-heading">{event.name}</h1>
                            <p className="text-sm text-text-muted mt-2">
                                Hosted by <Link to={`/profile/${event.profiles.id}`} className="font-semibold hover:underline text-primary">{event.profiles.name}</Link>
                            </p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                            {isCreator ? (
                                <>
                                    <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold text-sm">Delete</button>
                                </>
                            ) : (
                                <button onClick={handleRsvpToggle} disabled={isRsvpLoading || (isEventFull && !isUserAttending)} className={rsvpButtonClasses}>
                                    {isRsvpLoading ? <Spinner size="sm" /> : (isUserAttending ? 'You are going!' : (isEventFull ? 'Event Full' : 'RSVP'))}
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-slate-200 grid md:grid-cols-3 gap-6 text-sm">
                        <div className="flex items-start gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <div>
                                <h3 className="font-semibold text-text-heading">Date & Time</h3>
                                <p className="text-text-body">{format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}</p>
                                <p className="text-text-body">{format(new Date(event.event_date), 'p')}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <div>
                                <h3 className="font-semibold text-text-heading">Location</h3>
                                <p className="text-text-body">{event.location}</p>
                            </div>
                        </div>
                        {event.rsvp_limit !== null && (
                            <div className="flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197" /></svg>
                                <div>
                                    <h3 className="font-semibold text-text-heading">Capacity</h3>
                                    <p className="text-text-body">{event.event_attendees.length} / {event.rsvp_limit} spots filled</p>
                                    {isEventFull ? (
                                        <p className="font-semibold text-red-600">Event is full</p>
                                    ) : (
                                        <p className="font-semibold text-green-600">{event.rsvp_limit - event.event_attendees.length} spots remaining</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <h3 className="font-semibold text-text-heading mb-2">About this event</h3>
                        <p className="text-text-body whitespace-pre-wrap">{event.description}</p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <h3 className="font-semibold text-text-heading mb-4">{event.event_attendees.length} Attendees</h3>
                        {event.event_attendees.length > 0 ? (
                             <div className="flex flex-wrap gap-4">
                                {event.event_attendees.map(attendee => (
                                    <Link to={`/profile/${attendee.profiles.id}`} key={attendee.user_id} className="text-center group">
                                        <img src={attendee.profiles.avatar_url || `https://avatar.vercel.sh/${attendee.profiles.id}.png`} alt={attendee.profiles.name} className="w-12 h-12 rounded-full object-cover transition-transform group-hover:scale-110" />
                                        <p className="text-xs mt-1 w-12 truncate group-hover:underline">{attendee.profiles.name}</p>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-text-muted">No one is going yet. Be the first!</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventPage;