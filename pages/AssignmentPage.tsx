import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { AssignmentWithPoster, AssignmentCollaborationWithApplicant, Profile, AssignmentMessage } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import { format } from 'date-fns';
import VerifiedBadge from '../components/VerifiedBadge';

// --- Reusable Chat Component ---
interface AssignmentChatProps {
    collaborationId: number;
    currentUser: Profile;
    otherUser: Profile;
}
const AssignmentChat: React.FC<AssignmentChatProps> = ({ collaborationId, currentUser, otherUser }) => {
    const [messages, setMessages] = useState<AssignmentMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchMessages = useCallback(async () => {
        const { data } = await supabase.from('assignment_messages').select('*').eq('collaboration_id', collaborationId).order('created_at');
        setMessages(data || []);
    }, [collaborationId]);

    useEffect(() => {
        fetchMessages();
        const channel = supabase.channel(`assignment-chat-${collaborationId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assignment_messages', filter: `collaboration_id=eq.${collaborationId}` },
                payload => setMessages(current => [...current, payload.new as AssignmentMessage]))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [collaborationId, fetchMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        setIsSending(true);
        await supabase.from('assignment_messages').insert({
            collaboration_id: collaborationId,
            sender_id: currentUser.id,
            receiver_id: otherUser.id,
            content: newMessage.trim()
        });
        setNewMessage('');
        setIsSending(false);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b">
                <h3 className="font-bold text-text-heading">Private Chat with {otherUser.name.split(' ')[0]}</h3>
            </div>
            <div className="flex-1 p-3 space-y-4 overflow-y-auto">
                {messages.map(msg => {
                    const isSender = msg.sender_id === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}>
                            {!isSender && <img src={otherUser.avatar_url || `https://avatar.vercel.sh/${otherUser.id}.png`} alt={otherUser.name} className="w-6 h-6 rounded-full"/>}
                            <div className={`max-w-xs p-3 rounded-xl ${isSender ? 'bg-primary text-white rounded-br-none' : 'bg-slate-200 text-text-heading rounded-bl-none'}`}>
                                <p className="text-sm break-words">{msg.content}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-3 border-t flex gap-2">
                <input 
                    type="text" 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)} 
                    placeholder="Type a message..." 
                    className="w-full px-4 py-2 border rounded-full bg-slate-100 focus:ring-primary focus:border-primary transition-colors" 
                />
                <button type="submit" disabled={isSending} className="bg-primary text-white rounded-full p-2.5 flex-shrink-0 hover:bg-primary-focus disabled:opacity-50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                </button>
            </form>
        </div>
    );
};


const AssignmentPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user, profile: currentUserProfile } = useAuth();
    const [assignment, setAssignment] = useState<AssignmentWithPoster | null>(null);
    const [collaborations, setCollaborations] = useState<AssignmentCollaborationWithApplicant[]>([]);
    const [userCollaboration, setUserCollaboration] = useState<AssignmentCollaborationWithApplicant | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [submissionFile, setSubmissionFile] = useState<File | null>(null);
    const [posterTab, setPosterTab] = useState<'applicants' | 'work'>('applicants');
    const assignmentId = parseInt(id!, 10);

    const fetchData = useCallback(async () => {
        if (isNaN(assignmentId) || !user) return;
        if (!loading) setLoading(true);

        const assignmentPromise = supabase.from('assignments').select('*, profiles:poster_id(*), assignee:assignee_id(*)').eq('id', assignmentId).single();
        const collaborationsPromise = supabase.from('assignment_collaborations').select('*, profiles:applicant_id(*)').eq('assignment_id', assignmentId);

        const [{ data: assignmentData }, { data: collaborationsData }] = await Promise.all([assignmentPromise, collaborationsPromise]);
        
        setAssignment(assignmentData as any);
        setCollaborations((collaborationsData as any) || []);
        setUserCollaboration(collaborationsData?.find(c => c.applicant_id === user.id) as any || null);
        
        if (assignmentData?.assignee_id) {
            setPosterTab('work');
        }
        
        setLoading(false);
    }, [assignmentId, user, loading]);

    useEffect(() => {
        fetchData();
    }, [id, user]);

    const handleApply = async () => {
        if (actionLoading) return;
        setActionLoading(true);
        await supabase.from('assignment_collaborations').insert({ assignment_id: assignmentId, applicant_id: user!.id });
        await fetchData();
        setActionLoading(false);
    };
    
    const handleAccept = async (applicantId: string) => {
        setActionLoading(true);
        await supabase.from('assignments').update({ assignee_id: applicantId, status: 'in_progress' }).eq('id', assignmentId);
        await fetchData();
        setActionLoading(false);
    };

    const handleStatusUpdate = async (newStatus: AssignmentWithPoster['status']) => {
        setActionLoading(true);
        await supabase.from('assignments').update({ status: newStatus }).eq('id', assignmentId);
        await fetchData();
        setActionLoading(false);
    };

    const handleWorkSubmission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!submissionFile || !user) return;
        setActionLoading(true);

        try {
            const filePath = `assignment-submissions/${assignmentId}/${user.id}/${Date.now()}_${submissionFile.name}`;
            const { data, error } = await supabase.storage.from('community-files').upload(filePath, submissionFile);
            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('community-files').getPublicUrl(data.path);

            await supabase.from('assignments').update({
                status: 'submitted',
                submitted_file_url: publicUrl,
                submitted_file_name: submissionFile.name,
                submitted_at: new Date().toISOString()
            }).eq('id', assignmentId);

            await fetchData();
        } catch (error: any) {
            alert("Error submitting work: " + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    if (!assignment || !currentUserProfile) return <p className="text-center text-red-500 p-8">Assignment not found.</p>;

    const isPoster = assignment.poster_id === user?.id;
    const isAssignee = assignment.assignee_id === user?.id;
    const assignmentStatus = assignment.status;
    const assigneeProfile = assignment.assignee;

    return (
        <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card p-6 rounded-2xl shadow-soft border border-slate-200/50">
                        <span className="text-sm font-semibold uppercase text-primary">{assignment.college}</span>
                        <h1 className="text-3xl font-bold text-text-heading mt-1">{assignment.title}</h1>
                        <p className="mt-4 whitespace-pre-wrap text-text-body">{assignment.description}</p>
                        {assignment.file_url && (
                            <a href={assignment.file_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 font-semibold text-primary hover:underline">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A1 1 0 0111 2.586L15.414 7A1 1 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 12h8a1 1 0 001-1V7.414l-4-4H6a1 1 0 00-1 1v10a1 1 0 001 1z" clipRule="evenodd" /></svg>
                                {assignment.file_name || 'View Attachment'}
                            </a>
                        )}
                    </div>
                    
                    {/* Interaction Panel */}
                    <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50 min-h-[24rem]">
                        {isPoster ? (
                            <div>
                                <div className="border-b">
                                    <nav className="-mb-px flex space-x-6 px-6">
                                        <button onClick={() => setPosterTab('applicants')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${posterTab === 'applicants' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-body'}`}>Applicants ({collaborations.length})</button>
                                        <button onClick={() => setPosterTab('work')} disabled={!assignment.assignee_id} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm disabled:opacity-50 ${posterTab === 'work' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-body'}`}>Work & Chat</button>
                                    </nav>
                                </div>
                                {posterTab === 'applicants' && (
                                    <div className="p-4 space-y-2">
                                        {assignmentStatus === 'open' && collaborations.length === 0 && <p className="text-sm text-text-muted text-center p-4">No one has applied yet.</p>}
                                        {collaborations.map(collab => (
                                            <div key={collab.id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between">
                                                <Link to={`/profile/${collab.profiles.id}`} className="font-semibold flex items-center gap-2">
                                                    <img src={collab.profiles.avatar_url || `https://avatar.vercel.sh/${collab.profiles.id}.png`} alt={collab.profiles.name} className="w-8 h-8 rounded-full" />
                                                    {collab.profiles.name}
                                                    {collab.profiles.is_verified && <VerifiedBadge />}
                                                </Link>
                                                {assignmentStatus === 'open' && (
                                                    <button onClick={() => handleAccept(collab.applicant_id)} disabled={actionLoading} className="bg-green-500 text-white px-3 py-1 text-sm rounded-md font-semibold hover:bg-green-600 transition-colors">Accept</button>
                                                )}
                                                {assignment.assignee_id === collab.applicant_id && <span className="text-sm font-bold text-green-600">Assigned</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {posterTab === 'work' && assignment.assignee_id && assigneeProfile && (
                                    <div className="h-[32rem]">
                                        <AssignmentChat collaborationId={collaborations.find(c=>c.applicant_id === assignment.assignee_id)!.id} currentUser={currentUserProfile} otherUser={assigneeProfile} />
                                    </div>
                                )}
                            </div>
                        ) : isAssignee ? (
                            <div className="h-[32rem]">
                                <AssignmentChat collaborationId={userCollaboration!.id} currentUser={currentUserProfile} otherUser={assignment.profiles} />
                            </div>
                        ) : userCollaboration ? (
                            <div className="h-[32rem]">
                                <AssignmentChat collaborationId={userCollaboration.id} currentUser={currentUserProfile} otherUser={assignment.profiles} />
                            </div>
                        ) : <div className="p-6 text-center text-text-muted">Apply to start a conversation with the poster.</div>}
                    </div>
                </div>

                <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                    <div className="bg-card p-6 rounded-2xl shadow-soft border border-slate-200/50">
                        <p className="text-sm font-semibold text-text-muted text-center">BUDGET</p>
                        <p className="text-4xl font-bold text-green-600 text-center">₹{assignment.price}</p>
                        <p className="text-sm font-semibold text-text-muted text-center mt-4">STATUS</p>
                        <p className="font-bold capitalize text-center">{assignment.status.replace('_', ' ')}</p>
                        <p className="text-sm text-text-muted text-center mt-4">Due: {assignment.due_date ? format(new Date(assignment.due_date), 'PP') : 'N/A'}</p>
                        {!isPoster && !isAssignee && assignmentStatus === 'open' && (
                            <button onClick={handleApply} disabled={actionLoading || !!userCollaboration} className="mt-6 w-full bg-primary text-white py-2.5 rounded-lg font-semibold disabled:opacity-50 hover:bg-primary-focus transition-colors">
                                {actionLoading ? <Spinner size="sm"/> : userCollaboration ? 'Applied' : "I'm Interested"}
                            </button>
                        )}
                        {isAssignee && assignment.status === 'in_progress' && (
                             <form onSubmit={handleWorkSubmission} className="bg-slate-100 p-4 rounded-lg space-y-3 mt-6">
                                <h4 className="font-semibold text-sm">Submit Your Work</h4>
                                <input type="file" onChange={e => e.target.files && setSubmissionFile(e.target.files[0])} required className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                                <button type="submit" disabled={actionLoading || !submissionFile} className="w-full bg-primary text-white px-3 py-2 text-sm rounded-md font-semibold disabled:opacity-50">
                                    {actionLoading ? <Spinner size="sm" /> : 'Submit for Review'}
                                </button>
                            </form>
                        )}
                         {isPoster && assignment.status === 'submitted' && (
                             <div className="bg-slate-100 p-4 rounded-lg space-y-2 mt-6">
                                <h4 className="font-semibold text-sm">Review Submission</h4>
                                <div className="flex gap-2">
                                    <button onClick={() => handleStatusUpdate('completed')} disabled={actionLoading} className="flex-1 bg-green-500 text-white px-3 py-2 text-sm rounded-md font-semibold">Complete</button>
                                    <button onClick={() => handleStatusUpdate('in_progress')} disabled={actionLoading} className="flex-1 bg-yellow-500 text-white px-3 py-2 text-sm rounded-md font-semibold">Revisions</button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-card p-4 rounded-2xl shadow-soft border border-slate-200/50">
                        <h3 className="font-semibold mb-2 text-sm text-text-muted">POSTED BY</h3>
                        <Link to={`/profile/${assignment.profiles.id}`} className="flex items-center gap-3">
                            <img src={assignment.profiles.avatar_url || `https://avatar.vercel.sh/${assignment.profiles.id}.png`} alt={assignment.profiles.name} className="w-10 h-10 rounded-full object-cover"/>
                            <div>
                                <p className="font-bold text-text-heading">{assignment.profiles.name}</p>
                                <p className="text-xs text-text-body">{assignment.profiles.college}</p>
                            </div>
                        </Link>
                    </div>

                    {assigneeProfile && (
                        <div className="bg-card p-4 rounded-2xl shadow-soft border border-slate-200/50">
                            <h3 className="font-semibold mb-2 text-sm text-text-muted">ASSIGNED TO</h3>
                            <Link to={`/profile/${assigneeProfile.id}`} className="flex items-center gap-3">
                                <img src={assigneeProfile.avatar_url || `https://avatar.vercel.sh/${assigneeProfile.id}.png`} alt={assigneeProfile.name} className="w-10 h-10 rounded-full object-cover"/>
                                <div>
                                    <p className="font-bold text-text-heading">{assigneeProfile.name}</p>
                                    <p className="text-xs text-text-body">{assigneeProfile.college}</p>
                                </div>
                            </Link>
                        </div>
                    )}

                </aside>
            </div>
        </div>
    );
};

export default AssignmentPage;