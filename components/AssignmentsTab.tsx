import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { AssignmentWithPoster } from '../types';
import Spinner from './Spinner';
import { Link } from 'react-router-dom';
import PostAssignmentModal from './PostAssignmentModal';
import { format } from 'date-fns';

const AssignmentCard: React.FC<{ assignment: AssignmentWithPoster }> = ({ assignment }) => (
    <Link to={`/assignment/${assignment.id}`} className="block p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all duration-300 transform hover:scale-[1.02]">
        <div className="flex justify-between items-start">
            <div>
                <h4 className="font-bold text-text-heading">{assignment.title}</h4>
                <p className="text-xs text-text-muted mt-1">from {assignment.college}</p>
            </div>
            <span className="text-sm font-bold text-green-600">
                ₹{assignment.price}
            </span>
        </div>
        <p className="text-sm text-text-body mt-2 h-10 overflow-hidden">{assignment.description}</p>
        <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-text-muted font-semibold">Due: {assignment.due_date ? format(new Date(assignment.due_date), 'MMM d, yyyy') : 'N/A'}</p>
            <p className="text-xs text-text-muted">Posted by {assignment.profiles.name.split(' ')[0]}</p>
        </div>
    </Link>
);


const AssignmentsTab: React.FC = () => {
    const [assignments, setAssignments] = useState<AssignmentWithPoster[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);

    const fetchAssignments = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('assignments')
            .select('*, profiles:poster_id(*)')
            .eq('status', 'open')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching assignments:", error);
        } else if (data) {
            setAssignments(data as any);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAssignments();
    }, [fetchAssignments]);

    return (
        <div className="space-y-6 p-2">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-text-heading">Assignment Marketplace</h2>
                <button
                    onClick={() => setIsPostModalOpen(true)}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-focus transition-colors font-semibold shadow-soft text-sm"
                >
                    Post an Assignment
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
            ) : assignments.length === 0 ? (
                <div className="text-center text-gray-500 py-10 bg-slate-50 rounded-xl">
                    No open assignments right now.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assignments.map(assignment => <AssignmentCard key={assignment.id} assignment={assignment} />)}
                </div>
            )}

            {isPostModalOpen && (
                <PostAssignmentModal
                    onClose={() => setIsPostModalOpen(false)}
                    onSuccess={() => {
                        setIsPostModalOpen(false);
                        fetchAssignments();
                    }}
                />
            )}
        </div>
    );
};

export default AssignmentsTab;