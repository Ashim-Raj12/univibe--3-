import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';

interface TimePickerProps {
    value: string; // expects "HH:mm"
    onClose: () => void;
    onSet: (time: string) => void; // returns "HH:mm"
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onClose, onSet }) => {
    const parseTime = (timeStr: string) => {
        if (!/^\d{2}:\d{2}$/.test(timeStr)) {
            const now = new Date();
            return { h: now.getHours(), m: now.getMinutes() };
        }
        const [h, m] = timeStr.split(':').map(Number);
        return { h, m };
    };

    const initialTime = parseTime(value);
    const initialHour12 = initialTime.h === 0 ? 12 : initialTime.h > 12 ? initialTime.h - 12 : initialTime.h;

    const [hour, setHour] = useState<number>(initialHour12);
    const [minute, setMinute] = useState<number>(initialTime.m);
    const [ampm, setAmPm] = useState<'AM' | 'PM'>(initialTime.h >= 12 ? 'PM' : 'AM');
    const [view, setView] = useState<'hour' | 'minute'>('hour');
    const pickerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleSet = () => {
        let hour24 = hour;
        if (ampm === 'PM' && hour !== 12) {
            hour24 += 12;
        }
        if (ampm === 'AM' && hour === 12) {
            hour24 = 0;
        }
        const timeString = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        onSet(timeString);
    };

    const handleClear = () => {
        onSet('');
        onClose();
    };
    
    const AnalogClockFace: React.FC = () => {
        const items = view === 'hour'
            ? Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
            : Array.from({ length: 12 }, (_, i) => ({ value: i * 5, label: String(i * 5).padStart(2, '0') }));
            
        const selectedValue = view === 'hour' ? hour : minute;

        const handleSelect = (val: number) => {
            if (view === 'hour') {
                setHour(val);
                setTimeout(() => setView('minute'), 200);
            } else {
                setMinute(val);
            }
        };
        
        const angle = view === 'hour' ? ((hour % 12) / 12) * 360 : (minute / 60) * 360;
        const handRotationStyle = { transform: `rotate(${angle}deg)` };

        return (
            <div className="relative w-64 h-64 bg-[#34495E] rounded-full flex items-center justify-center">
                <div 
                    className="absolute h-1/2 w-0.5 bottom-1/2 left-1/2 -translate-x-1/2" 
                    style={{ transformOrigin: 'bottom', ...handRotationStyle }}
                >
                    <div className="w-full bg-cyan-400" style={{ height: 'calc(100% - 20px)' }}></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-cyan-400"></div>
                </div>
                 <div className="absolute w-2 h-2 bg-white rounded-full z-10"></div>

                {items.map(({ value, label }, i) => {
                    const itemAngle = i * 30 - 60;
                    const style = { transform: `rotate(${itemAngle}deg) translate(104px) rotate(${-itemAngle}deg)` };
                    const isSelected = value === selectedValue;
                    return (
                        <div key={value} className="absolute w-10 h-10 top-1/2 left-1/2 -mt-5 -ml-5" style={style}>
                            <button type="button" onClick={() => handleSelect(value)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-cyan-400 text-black text-lg font-bold' : 'hover:bg-gray-600'}`}>
                                {label}
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div ref={pickerRef} className="absolute top-full mt-2 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 bg-[#212121] text-white p-4 rounded-lg shadow-xl z-20 w-auto sm:w-[500px] animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
            <div className="flex flex-col sm:flex-row justify-between">
                <div className="flex flex-col items-center justify-center p-4">
                    <div className="text-6xl font-light flex items-center">
                        <span className={`cursor-pointer p-2 rounded ${view === 'hour' ? 'bg-cyan-400/20 text-cyan-400' : ''}`} onClick={() => setView('hour')}>
                            {String(hour).padStart(2, '0')}
                        </span>
                        <span className="mx-1">:</span>
                        <span className={`cursor-pointer p-2 rounded ${view === 'minute' ? 'bg-cyan-400/20 text-cyan-400' : ''}`} onClick={() => setView('minute')}>
                            {String(minute).padStart(2, '0')}
                        </span>
                    </div>
                    <div className="mt-4 border border-gray-600 rounded-full flex flex-col text-sm">
                        <button type="button" onClick={() => setAmPm('AM')} className={`px-4 py-2 rounded-t-full transition-colors ${ampm === 'AM' ? 'bg-cyan-400 text-black' : 'hover:bg-gray-700'}`}>AM</button>
                        <button type="button" onClick={() => setAmPm('PM')} className={`px-4 py-2 rounded-b-full transition-colors ${ampm === 'PM' ? 'bg-cyan-400 text-black' : 'hover:bg-gray-700'}`}>PM</button>
                    </div>
                </div>

                <div className="flex items-center justify-center mt-4 sm:mt-0">
                    <AnalogClockFace />
                </div>
            </div>
            
            <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-700">
                <button type="button" className="p-2 rounded-full hover:bg-gray-700" title="Switch to text input mode">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                </button>
                <div className="flex gap-2 sm:gap-4">
                    <button type="button" onClick={handleClear} className="text-cyan-400 font-semibold hover:bg-gray-700 px-4 py-2 rounded">Clear</button>
                    <button type="button" onClick={onClose} className="text-cyan-400 font-semibold hover:bg-gray-700 px-4 py-2 rounded">Cancel</button>
                    <button type="button" onClick={handleSet} className="text-cyan-400 font-semibold hover:bg-gray-700 px-4 py-2 rounded">Set</button>
                </div>
            </div>
        </div>
    );
};


interface CreateEventModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ onClose, onSuccess }) => {
    const { user, profile } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [rsvpLimit, setRsvpLimit] = useState('');
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    
    const [isCreationAllowed, setIsCreationAllowed] = useState(false);
    const [requiredDomain, setRequiredDomain] = useState<string | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        const checkPermissions = async () => {
            if (!profile || !profile.college || !user) {
                setIsCreationAllowed(false);
                setCheckingAuth(false);
                return;
            }

            setCheckingAuth(true);
            const { data: college, error } = await supabase
                .from('colleges')
                .select('accepted_domain')
                .eq('name', profile.college)
                .single();
            
            if (error) {
                console.error("Error fetching college domain restriction:", error);
                setIsCreationAllowed(true); // Default to allowed if check fails
            } else if (college) {
                if (college.accepted_domain) {
                    setRequiredDomain(college.accepted_domain);
                    const userDomain = user.email?.split('@')[1];
                    setIsCreationAllowed(userDomain === college.accepted_domain);
                } else {
                    setIsCreationAllowed(true); // No domain set, so allowed
                }
            }
            setCheckingAuth(false);
        };
        checkPermissions();
    }, [profile, user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setBannerFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !profile || !name.trim() || !eventDate || !eventTime) {
            setError('Please fill out all required fields.');
            return;
        }
        if (!isCreationAllowed) {
            setError('You are not authorized to create events for this college.');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            let bannerUrl: string | null = null;
            const combinedDateTime = new Date(`${eventDate}T${eventTime}`).toISOString();

            if (bannerFile) {
                const filePath = `${user.id}/event_${Date.now()}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('event-banners')
                    .upload(filePath, bannerFile);

                if (uploadError) throw uploadError;
                if (!uploadData?.path) throw new Error("Banner upload failed, please try again.");

                const { data: { publicUrl } } = supabase.storage.from('event-banners').getPublicUrl(uploadData.path);
                bannerUrl = publicUrl;
            }

            const { error: insertError } = await supabase.from('events').insert({
                name,
                description,
                banner_url: bannerUrl,
                event_date: combinedDateTime,
                location,
                creator_id: user.id,
                college: profile.college,
                rsvp_limit: rsvpLimit ? parseInt(rsvpLimit, 10) : null,
            });

            if (insertError) throw insertError;
            
            onSuccess();

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };
    
    const inputClasses = "w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm disabled:bg-slate-200 disabled:cursor-not-allowed";

    const formatTimeForDisplay = (time24: string) => {
        if (!time24) return '';
        const [h, m] = time24.split(':');
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${String(hour12).padStart(2, '0')}:${m} ${ampm}`;
    };

    const renderFormContent = () => {
        if(checkingAuth) {
            return <div className="p-6 flex justify-center"><Spinner /></div>;
        }
        
        if (!isCreationAllowed) {
            return (
                <div className="p-6 text-center">
                    <h3 className="font-semibold text-text-heading">Permission Required</h3>
                    <p className="text-sm text-text-body mt-2">
                        Event creation for {profile?.college} is restricted to users with a verified college email.
                    </p>
                    {requiredDomain && (
                         <p className="text-sm text-text-body mt-2">
                            Please use an account with a <strong className="text-primary">@{requiredDomain}</strong> email address.
                        </p>
                    )}
                </div>
            )
        }

        return (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-body mb-1">Event Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-body mb-1">Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClasses} rows={4}></textarea>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Date</label>
                        <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClasses} required min={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div className="relative">
                        <label className="block text-sm font-medium text-text-body mb-1">Time</label>
                        <button type="button" onClick={() => setIsTimePickerOpen(p => !p)} className={`${inputClasses} text-left h-[38px]`}>
                            {eventTime ? formatTimeForDisplay(eventTime) : <span className="text-slate-400">Select a time</span>}
                        </button>
                         {isTimePickerOpen && (
                            <TimePicker
                                value={eventTime}
                                onClose={() => setIsTimePickerOpen(false)}
                                onSet={(time) => {
                                    setEventTime(time);
                                    setIsTimePickerOpen(false);
                                }}
                            />
                        )}
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-text-body mb-1">Location</label>
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClasses} required placeholder="e.g., Campus Library or Online" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-body mb-1">RSVP Limit (Optional)</label>
                    <input 
                        type="number" 
                        value={rsvpLimit} 
                        onChange={(e) => setRsvpLimit(e.target.value)} 
                        className={inputClasses} 
                        placeholder="e.g., 50" 
                        min="1" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-body mb-1">Banner Image (Optional)</label>
                    {preview && <img src={preview} alt="Banner preview" className="w-full h-32 object-cover rounded-md mb-2"/>}
                    <input type="file" onChange={handleFileChange} accept="image/*" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}
                
                <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={onClose} className="bg-slate-100 text-text-body px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold">
                        {loading ? <Spinner size="sm" /> : 'Create'}
                    </button>
                </div>
            </form>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-background">
                    <h2 className="text-xl font-bold text-text-heading">Create an Event</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-heading">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                {renderFormContent()}
            </div>
        </div>
    );
};

export default CreateEventModal;