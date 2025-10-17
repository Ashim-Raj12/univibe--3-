import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Feedback } from '../types';
import Spinner from '../components/Spinner';
import { format } from 'date-fns';

const feedbackCategories = ['Bug Report', 'Feature Request', 'General Feedback', 'Other'];

const FeedbackStatusBadge: React.FC<{ status: Feedback['status'] }> = ({ status }) => {
    const styles = {
        submitted: 'bg-blue-100 text-blue-800',
        in_review: 'bg-yellow-100 text-yellow-800',
        resolved: 'bg-green-100 text-green-800',
    };
    const text = {
        submitted: 'Submitted',
        in_review: 'In Review',
        resolved: 'Resolved',
    }
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>;
};

const FeedbackPage: React.FC = () => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(feedbackCategories[0] as Feedback['category']);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    
    const [myFeedback, setMyFeedback] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [formErrors, setFormErrors] = useState<{ title?: string; description?: string }>({});

    const fetchMyFeedback = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('feedback')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (data) setMyFeedback(data);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchMyFeedback();
    }, [fetchMyFeedback]);
    
    const validateForm = () => {
        const newErrors: { title?: string; description?: string } = {};
        
        if (!title.trim()) {
            newErrors.title = 'Subject is required.';
        } else if (title.trim().length > 150) {
            newErrors.title = 'Subject must be 150 characters or less.';
        }

        if (!description.trim()) {
            newErrors.description = 'Details are required.';
        } else if (description.trim().length > 2000) {
            newErrors.description = 'Details must be 2000 characters or less.';
        }

        setFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!validateForm()) {
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(false);

        const { error: insertError } = await supabase.from('feedback').insert({
            user_id: user.id,
            category,
            title: title.trim(),
            description: description.trim(),
        });

        if (insertError) {
            setError(insertError.message);
        } else {
            setSuccess(true);
            setTitle('');
            setDescription('');
            setCategory(feedbackCategories[0] as Feedback['category']);
            fetchMyFeedback(); // Refresh the list
            setTimeout(() => setSuccess(false), 4000);
        }
        setSubmitting(false);
    };

    const inputClasses = "w-full px-3 py-2 bg-slate-100 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            <div>
                <h1 className="text-3xl font-bold text-text-heading">Submit Feedback</h1>
                <p className="text-text-body mt-2">Have a suggestion, a bug to report, or general feedback? We'd love to hear from you!</p>
            </div>

            <div className="bg-card p-6 rounded-2xl shadow-soft border border-slate-200/50">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {success && <p className="p-3 bg-green-100 text-green-700 font-semibold text-sm rounded-lg">Thank you! Your feedback has been submitted successfully.</p>}
                    <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Category</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value as Feedback['category'])} className={`${inputClasses} border-slate-200`}>
                            {feedbackCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                     <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-text-body">Subject</label>
                            <span className={`text-xs ${title.length > 150 ? 'text-red-500' : 'text-text-muted'}`}>{title.length}/150</span>
                        </div>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            className={`${inputClasses} ${formErrors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-slate-200'}`} 
                            placeholder="A brief summary of your feedback"
                        />
                        {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-text-body">Details</label>
                            <span className={`text-xs ${description.length > 2000 ? 'text-red-500' : 'text-text-muted'}`}>{description.length}/2000</span>
                        </div>
                        <textarea 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                            className={`${inputClasses} ${formErrors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-slate-200'}`} 
                            rows={5} 
                            placeholder="Please provide as much detail as possible."
                        ></textarea>
                         {formErrors.description && <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>}
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="text-right">
                        <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold text-sm ml-auto">
                            {submitting ? <Spinner size="sm" /> : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>

            <div>
                 <h2 className="text-2xl font-bold text-text-heading">My Submissions</h2>
                 <div className="mt-4 space-y-4">
                    {loading ? <div className="flex justify-center py-8"><Spinner /></div> : myFeedback.length === 0 ? (
                        <p className="text-center text-text-muted text-sm py-8 bg-card rounded-2xl shadow-soft border border-slate-200/50">You haven't submitted any feedback yet.</p>
                    ) : (
                        myFeedback.map(f => (
                            <div key={f.id} className="bg-card p-4 rounded-xl shadow-soft border border-slate-200/50">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <p className="font-bold text-text-heading">{f.title}</p>
                                        <p className="text-xs text-text-muted mt-1">{f.category} &bull; {format(new Date(f.created_at), 'PP')}</p>
                                    </div>
                                    <FeedbackStatusBadge status={f.status} />
                                </div>
                                <p className="text-sm text-text-body mt-3 whitespace-pre-wrap">{f.description}</p>
                                {f.admin_reply && f.replied_at && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50 p-3 rounded-lg">
                                        <p className="font-semibold text-sm text-primary">Admin Reply</p>
                                        <p className="text-xs text-text-muted">Replied on {format(new Date(f.replied_at), 'PP')}</p>
                                        <p className="text-sm text-text-body mt-2 whitespace-pre-wrap">{f.admin_reply}</p>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                 </div>
            </div>
        </div>
    );
};

export default FeedbackPage;