import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { EventWithCreatorAndAttendees } from '../types';
import EventCard from '../components/EventCard';
import Spinner from '../components/Spinner';
import CreateEventModal from '../components/CreateEventModal';
import { MagicGrid } from '../components/MagicGrid';
import EventCardSkeleton from '../components/EventCardSkeleton';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

const EventsListPage: React.FC = () => {
    const { user, profile } = useAuth();
    const [events, setEvents] = useState<EventWithCreatorAndAttendees[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchEvents = useCallback(async () => {
        if (!profile?.college) {
            setLoading(false);
            setEvents([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const now = new Date().toISOString();
            let query = supabase
                .from('events')
                .select('*, profiles:creator_id(*), event_attendees(user_id, profiles(id, name, avatar_url))')
                .eq('college', profile.college)
                .gte('event_date', now)
                .order('event_date', { ascending: true });
            
            if (debouncedSearch) {
                query = query.ilike('name', `%${debouncedSearch}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            setEvents(data as any);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, profile]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleEventCreated = () => {
        setIsCreateModalOpen(false);
        fetchEvents();
    };

    const filterInputClasses = "w-full p-3 bg-dark-card border-none rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-on-dark placeholder:text-text-muted";
    
    if (!profile?.college && !loading) {
        return (
            <div className="text-center text-gray-500 bg-card p-10 rounded-2xl border border-slate-200/80">
                <p>Please set your college in your profile to see relevant events.</p>
                <Link to={`/profile/${user?.id}`} className="mt-4 inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus font-semibold">
                    Go to Profile
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-heading">Events at {profile?.college}</h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-focus transition-all duration-300 font-semibold shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5 active:scale-95"
                >
                    Create Event
                </button>
            </div>

             <div className="bg-card p-4 rounded-lg shadow-sm border border-slate-200/80 mb-6">
                <div className="grid md:grid-cols-1 gap-4">
                    <input
                        type="text"
                        placeholder="Search by event name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className={filterInputClasses}
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => <EventCardSkeleton key={i} />)}
                </div>
            ) : error ? (
                <p className="text-center text-red-500">{error}</p>
            ) : events.length === 0 ? (
                 <p className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">
                    No upcoming events found for your college.
                 </p>
            ) : (
                <MagicGrid>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {events.map(event => (
                            <EventCard key={event.id} event={event} onRsvpChange={fetchEvents} />
                        ))}
                    </div>
                </MagicGrid>
            )}

            {isCreateModalOpen && (
                <CreateEventModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={handleEventCreated}
                />
            )}
        </>
    );
};

export default EventsListPage;