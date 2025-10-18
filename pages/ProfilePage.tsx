import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile, PostWithProfile, VerificationSubmission } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import PostCard from '../components/PostCard';
import VerifiedBadge from '../components/VerifiedBadge';
import VerificationModal from '../components/VerificationModal';
import IcebreakerModal from '../components/IcebreakerModal'; 

export const getEnrollmentStatusText = (status: 'current_student' | 'incoming_student' | 'passed_out' | 'parent' | null | undefined) => {
    if (status === 'current_student') return 'Current Student';
    if (status === 'incoming_student') return 'Future Student';
    if (status === 'passed_out') return 'Alumni';
    if (status === 'parent') return 'Parent';
    return '';
};

const debounce = <F extends (...args: any[]) => any>(func: F, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): void => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
};

const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .replace(/\s+/g, ' ') // Collapse whitespace
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface EditProfileModalProps {
    profile: Profile;
    onClose: () => void;
    onSuccess: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ profile, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: profile.name || '',
        username: profile.username || '',
        college: profile.college || '',
        state: profile.state || '',
        bio: profile.bio || '',
        course: profile.course || '',
        joining_year: profile.joining_year || '',
        hobbies_interests: profile.hobbies_interests || '',
        linkedin_url: profile.linkedin_url || '',
        twitter_url: profile.twitter_url || '',
        github_url: profile.github_url || '',
        enrollment_status: profile.enrollment_status || '',
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(profile.avatar_url);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [usernameLoading, setUsernameLoading] = useState(false);
    const [usernameError, setUsernameError] = useState<string | null>(null);

    const isParent = profile.enrollment_status === 'parent';

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const checkUsername = useCallback(debounce(async (uname: string) => {
        setUsernameLoading(true);
        if (uname.length > 0 && uname !== profile.username) {
            if (!/^[a-z0-9_]{3,15}$/.test(uname)) {
                setUsernameError('3-15 lowercase letters, numbers, or underscores.');
                setUsernameLoading(false);
                return;
            }
            const { data } = await supabase.from('profiles').select('id').eq('username', uname).single();
            setUsernameError(data ? 'Username is already taken.' : null);
        } else {
            setUsernameError(null);
        }
        setUsernameLoading(false);
    }, 500), [profile.username]);

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        setFormData(prev => ({...prev, username: value}));
        if (value.length > 0) {
            setUsernameLoading(true);
            checkUsername(value);
        } else {
            setUsernameError(null);
            setUsernameLoading(false);
        }
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || usernameError || usernameLoading) return;

        setLoading(true);
        setError(null);
        let avatarUrl = profile.avatar_url;

        try {
            if (avatarFile) {
                const filePath = `${user.id}/avatar_${Date.now()}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile, { upsert: true });

                if (uploadError) throw uploadError;
                if (!uploadData?.path) throw new Error("Avatar upload failed, please try again.");

                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
                avatarUrl = publicUrl;
            }

            const updates: any = {
                ...formData,
                avatar_url: avatarUrl,
                username: formData.username || null,
            };
            
            if (!isParent) {
                 updates.college = toTitleCase(formData.college);
                 updates.joining_year = formData.joining_year ? parseInt(String(formData.joining_year), 10) : null;
                 updates.enrollment_status = formData.enrollment_status || null;
            } else {
                delete updates.college;
                delete updates.state;
                delete updates.course;
                delete updates.joining_year;
                delete updates.enrollment_status;
            }

            const { error: updateError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (updateError) throw updateError;
            
            onSuccess();

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };
    
    const inputClasses = "w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50";
    const isUsernameSettable = !profile.username;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex  justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="bg-background w-full h-[100vh] flex flex-col sm:h-auto sm:rounded-lg shadow-xl sm:max-w-lg sm:max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-text-heading">Edit Profile</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-heading">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form id="edit-profile-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="flex flex-col items-center">
                        <img src={preview || `https://avatar.vercel.sh/${profile.id}.png`} alt="Avatar preview" className="w-24 h-24 rounded-full object-cover mb-2"/>
                        <label className="cursor-pointer text-sm font-semibold text-primary hover:underline">
                            Change Photo
                            <input type="file" onChange={handleFileChange} accept="image/*" className="hidden"/>
                        </label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-body mb-1">Name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClasses} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-body mb-1">Username</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    name="username" 
                                    value={formData.username} 
                                    onChange={isUsernameSettable ? handleUsernameChange : undefined} 
                                    className={`${inputClasses} ${!isUsernameSettable ? 'bg-slate-200 cursor-not-allowed' : ''}`} 
                                    disabled={!isUsernameSettable}
                                    required 
                                />
                                {isUsernameSettable && usernameLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner size="sm" /></div>}
                            </div>
                             {isUsernameSettable && (
                                <>
                                {usernameError ? (
                                    <p className="text-red-500 text-xs mt-1">{usernameError}</p>
                                ) : formData.username.length > 2 && !usernameLoading && (
                                    <p className="text-green-600 text-xs mt-1">Username available!</p>
                                )}
                                </>
                            )}
                        </div>
                        {!isParent && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-text-body mb-1">College</label>
                                    <input type="text" name="college" value={formData.college} onChange={handleChange} className={inputClasses} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-body mb-1">State</label>
                                    <input type="text" name="state" value={formData.state} onChange={handleChange} className={inputClasses} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-body mb-1">Course</label>
                                    <input type="text" name="course" value={formData.course} onChange={handleChange} className={inputClasses} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-body mb-1">Joining Year</label>
                                    <input type="number" name="joining_year" value={String(formData.joining_year)} onChange={handleChange} className={inputClasses} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-body mb-1">Enrollment Status</label>
                                    <select name="enrollment_status" value={formData.enrollment_status} onChange={handleChange} className={inputClasses}>
                                        <option value="" disabled>Select status...</option>
                                        <option value="incoming_student">Future Student</option>
                                        <option value="current_student">Current Student</option>
                                        <option value="passed_out">Alumni / Passed Out</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-body mb-1">Bio</label>
                        <textarea name="bio" value={formData.bio} onChange={handleChange} className={inputClasses} rows={3}></textarea>
                    </div>

                    {!isParent && (
                         <>
                            <div>
                                <label className="block text-sm font-medium text-text-body mb-1">Hobbies & Interests</label>
                                <textarea name="hobbies_interests" value={formData.hobbies_interests} onChange={handleChange} className={inputClasses} placeholder="e.g., Coding, Music, Hiking" rows={2}></textarea>
                                <p className="text-xs text-text-muted mt-1">Separate with commas.</p>
                            </div>
                             <div className="pt-4 mt-4 border-t border-slate-200">
                                <label className="block text-sm font-medium text-text-body mb-2">Social Links</label>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-24 text-sm text-text-muted flex items-center gap-1.5 shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                            LinkedIn
                                        </span>
                                        <input type="url" name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} className={inputClasses} placeholder="https://linkedin.com/in/..." />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-24 text-sm text-text-muted flex items-center gap-1.5 shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.616 1.923 2.397 3.328 4.491 3.365-2.012 1.574-4.549 2.502-7.34 2.502-.478 0-.947-.027-1.412-.084 2.618 1.68 5.734 2.649 9.049 2.649 10.956 0 17.03-9.143 16.717-17.332z"/></svg>
                                            Twitter
                                        </span>
                                        <input type="url" name="twitter_url" value={formData.twitter_url} onChange={handleChange} className={inputClasses} placeholder="https://twitter.com/..." />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-24 text-sm text-text-muted flex items-center gap-1.5 shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                            GitHub
                                        </span>
                                        <input type="url" name="github_url" value={formData.github_url} onChange={handleChange} className={inputClasses} placeholder="https://github.com/..." />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </form>
                <div className="p-6 pt-4 flex-shrink-0 border-t border-slate-200">
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="bg-slate-100 text-text-body px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold">
                            Cancel
                        </button>
                        <button type="submit" form="edit-profile-form" disabled={loading || usernameLoading || !!usernameError} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[100px] font-semibold">
                            {loading ? <Spinner size="sm" /> : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LinkedinIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
);
const TwitterIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.616 1.923 2.397 3.328 4.491 3.365-2.012 1.574-4.549 2.502-7.34 2.502-.478 0-.947-.027-1.412-.084 2.618 1.68 5.734 2.649 9.049 2.649 10.956 0 17.03-9.143 16.717-17.332z"/></svg>
);
const GithubIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
);


const ProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user, profile: currentUserProfile, refetchProfile } = useAuth();
    const navigate = useNavigate();
    
    const [profile, setProfile] = useState<Profile | null>(null);
    const [posts, setPosts] = useState<PostWithProfile[]>([]);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [followersPreview, setFollowersPreview] = useState<Profile[]>([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState<VerificationSubmission['status'] | null>(null);
    const [rejectionNotes, setRejectionNotes] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isIcebreakerModalOpen, setIsIcebreakerModalOpen] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const isOwner = user?.id === id;

    const fetchProfileAndPosts = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);

        try {
            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (profileError || !profileData) throw profileError || new Error('Profile not found');
            setProfile(profileData);

            // Fetch posts
            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('*, profiles!inner(*), likes(*), comments!inner(count)')
                .eq('user_id', id)
                .order('created_at', { ascending: false });
            if (postsError) throw postsError;
            setPosts(postsData as any);
            
            // Fetch followers/following counts
            const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id);
            const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id);
            setFollowerCount(followers ?? 0);
            setFollowingCount(following ?? 0);

            // Fetch followers preview
            if ((followers ?? 0) > 0) {
                const { data: followerIds } = await supabase.from('follows').select('follower_id').eq('following_id', id).limit(9);
                if (followerIds) {
                    const { data: followerProfiles } = await supabase.from('profiles').select('*').in('id', followerIds.map(f => f.follower_id));
                    setFollowersPreview(followerProfiles || []);
                }
            } else {
                setFollowersPreview([]);
            }

            if (user && user.id !== id) {
                const { data: follow } = await supabase.from('follows').select('id').match({ follower_id: user.id, following_id: id }).single();
                setIsFollowing(!!follow);
            }

            if (isOwner && !profileData.is_verified && profileData.enrollment_status !== 'parent') {
                const { data: submissionData } = await supabase
                    .from('verification_submissions')
                    .select('status, reviewer_notes')
                    .eq('user_id', id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (submissionData) {
                    setVerificationStatus(submissionData.status);
                    setRejectionNotes(submissionData.reviewer_notes);
                } else {
                    setVerificationStatus(null);
                    setRejectionNotes(null);
                }
            }

        } catch (e: any) {
            console.error('Error fetching profile page data:', e);
            setError(e.message);
            if(e.message.includes('0 rows')) setError("Profile not found.");
        } finally {
            setLoading(false);
        }
    }, [id, user, isOwner]);

    useEffect(() => {
        fetchProfileAndPosts();
    }, [fetchProfileAndPosts]);
    
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            alert("File is too large. Max size is 2MB.");
            return;
        }

        setAvatarLoading(true);
        try {
            const filePath = `${user.id}/avatar`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;
            if (!uploadData?.path) throw new Error("Avatar upload failed, please try again.");

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
            const uniqueUrl = `${publicUrl}?t=${new Date().getTime()}`;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: uniqueUrl })
                .eq('id', user.id);
            
            if (updateError) throw updateError;
            
            await fetchProfileAndPosts();
            await refetchProfile();

        } catch (err: any) {
            console.error("Error uploading avatar:", err);
            alert("Failed to upload avatar: " + err.message);
        } finally {
            setAvatarLoading(false);
            if (avatarInputRef.current) {
                avatarInputRef.current.value = "";
            }
        }
    };


    const handlePostDeleted = (postId: number) => {
        setPosts(posts.filter(p => p.id !== postId));
    };

    const handleProfileUpdate = () => {
        setIsEditing(false);
        fetchProfileAndPosts();
        if(isOwner) refetchProfile();
    };

    const handleVerificationSuccess = () => {
        setIsVerifying(false);
        fetchProfileAndPosts();
    }

    const handleMessageClick = () => {
        if (profile) navigate(`/chat/${profile.id}`);
    };
    
    const handleSelectIcebreaker = (question: string) => {
        setIsIcebreakerModalOpen(false);
        navigate(`/chat/${id}`, { state: { prefilledMessage: question } });
    };

    const handleFollowToggle = async () => {
        if (!user || !id || isOwner || actionLoading) return;
        
        setActionLoading(true);
        try {
            if (isFollowing) { // Unfollow
                const { error } = await supabase.from('follows').delete().match({ follower_id: user.id, following_id: id });
                if (error) throw error;
                setIsFollowing(false);
                setFollowerCount(prev => prev - 1);
            } else { // Follow
                const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: id });
                if (error) throw error;
                setIsFollowing(true);
                setFollowerCount(prev => prev + 1);
            }
        } catch(e: any) {
            console.error('Follow action failed', e);
            alert('An error occurred. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };
    
    const renderActionButtons = () => {
        const baseClasses = "px-4 py-2 rounded-lg transition-colors font-semibold flex items-center justify-center min-w-[100px]";

        if (isFollowing) {
             return (
                 <>
                    <button onClick={handleFollowToggle} disabled={actionLoading} className={`${baseClasses} bg-slate-200 text-text-body hover:bg-slate-300`}>
                        {actionLoading ? <Spinner size="sm" /> : 'Following'}
                    </button>
                    <button onClick={() => setIsIcebreakerModalOpen(true)} className={`${baseClasses} bg-secondary/10 text-secondary hover:bg-secondary/20`} title="Get AI-powered icebreakers">
                         ✨
                    </button>
                    <button onClick={handleMessageClick} className={`${baseClasses} bg-secondary text-white hover:bg-sky-600`}>Message</button>
                </>
            )
        }
        
        return <button onClick={handleFollowToggle} disabled={actionLoading} className={`${baseClasses} bg-primary text-white hover:bg-primary-focus`}>{actionLoading ? <Spinner size="sm" /> : 'Follow'}</button>;
    }

    if (loading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    if (error) return <p className="text-center text-red-500 p-8">{error}</p>;
    if (!profile) return <p className="text-center text-gray-500 p-8">Could not load profile.</p>;
    
    const isIncompleteProfile = isOwner && !profile.college && profile.enrollment_status !== 'parent';

    return (
        <>
            {isIncompleteProfile && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r-lg shadow-soft mb-6 animate-fade-in-up">
                    <p className="font-bold">Welcome to UniVibe!</p>
                    <p>Please complete your profile to unlock all features and start exploring. Click "Edit Profile" to get started.</p>
                </div>
            )}
            <div className="bg-card p-6 rounded-lg shadow-sm border border-slate-200/80 mb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <div className="relative group flex-shrink-0">
                        <img
                            src={profile.avatar_url || `https://avatar.vercel.sh/${profile.id}.png`}
                            alt={profile.name}
                            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md"
                        />
                        {isOwner && (
                            <>
                                <div 
                                    className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                                <input
                                    type="file"
                                    ref={avatarInputRef}
                                    onChange={handleAvatarUpload}
                                    accept="image/png, image/jpeg, image/webp"
                                    className="hidden"
                                    disabled={avatarLoading}
                                />
                            </>
                        )}
                        {avatarLoading && (
                             <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                                <Spinner />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                             <h1 className="text-3xl font-bold text-text-heading">{profile.name}</h1>
                             {profile.is_verified && <VerifiedBadge size="h-5 w-5" />}
                             {profile.profile_remark && (
                                <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-md">
                                    {profile.profile_remark}
                                </span>
                            )}
                        </div>
                        <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                             {profile.username && <p className="text-lg text-text-muted">@{profile.username}</p>}
                        </div>

                        {profile.enrollment_status && (
                            <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full ${profile.enrollment_status === 'current_student' ? 'bg-blue-100 text-blue-800' : (profile.enrollment_status === 'incoming_student' || profile.enrollment_status === 'passed_out') ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                                {getEnrollmentStatusText(profile.enrollment_status)}
                            </span>
                        )}
                        <div className="flex items-center gap-4 justify-center sm:justify-start mt-2">
                             <Link to={`/friends?userId=${profile.id}&view=followers`} className="text-text-body hover:underline"><span className="font-bold text-text-heading">{followerCount}</span> Followers</Link>
                             <Link to={`/friends?userId=${profile.id}&view=following`} className="text-text-body hover:underline"><span className="font-bold text-text-heading">{followingCount}</span> Following</Link>
                        </div>
                         {(profile.linkedin_url || profile.twitter_url || profile.github_url) && (
                            <div className="mt-4 flex items-center gap-4 text-text-muted justify-center sm:justify-start">
                                {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary" aria-label="LinkedIn"><LinkedinIcon /></a>}
                                {profile.twitter_url && <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary" aria-label="Twitter"><TwitterIcon /></a>}
                                {profile.github_url && <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary" aria-label="GitHub"><GithubIcon /></a>}
                            </div>
                        )}
                        {profile.college && <p className="text-text-body mt-2">{profile.college} &bull; {profile.state}</p>}
                        {profile.course && <p className="text-sm text-text-muted">{profile.course} {profile.joining_year && `(Batch of ${profile.joining_year})`}</p>}
                        {profile.bio && <p className="mt-4 text-text-body">{profile.bio}</p>}
                        {profile.hobbies_interests && (
                            <div className="mt-4">
                                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                    {profile.hobbies_interests.split(',').map(hobby => hobby.trim()).filter(Boolean).map((hobby, index) => (
                                        <span key={index} className="bg-slate-100 text-text-body text-xs font-semibold px-2.5 py-1 rounded-full">{hobby}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                        {isOwner ? (
                            <button onClick={() => setIsEditing(true)} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-focus transition-colors font-semibold">
                                Edit Profile
                            </button>
                        ) : (
                            renderActionButtons()
                        )}
                    </div>
                </div>
                
                {isOwner && !profile.is_verified && profile.enrollment_status !== 'parent' && (
                    <div className="mt-6 pt-6 border-t border-slate-200/80">
                        <h2 className="text-lg font-bold text-text-heading mb-2">Verification Status</h2>
                        {verificationStatus === 'pending' && (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r-lg" role="alert">
                                <p className="font-bold">Pending Review</p>
                                <p>Your ID submission is currently being reviewed by our team. This usually takes 24-48 hours.</p>
                            </div>
                        )}
                        {verificationStatus === 'rejected' && (
                            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg" role="alert">
                                <p className="font-bold">Submission Rejected</p>
                                {rejectionNotes && <p className="mt-1"><strong>Reason:</strong> {rejectionNotes}</p>}
                                <p className="mt-2">Please review the reason and submit your ID again.</p>
                                <button onClick={() => setIsVerifying(true)} className="mt-3 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold text-sm">
                                    Resubmit ID
                                </button>
                            </div>
                        )}
                        {verificationStatus === null && (
                            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-r-lg" role="alert">
                                <p className="font-bold">Become a Verified Student</p>
                                <p>Verify your student status to get access to exclusive campus features like Events and the College Hub.</p>
                                <button onClick={() => setIsVerifying(true)} className="mt-3 bg-secondary text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors font-semibold text-sm">
                                    Get Verified
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {followerCount > 0 && (
                <div className="bg-card p-6 rounded-lg shadow-sm border border-slate-200/80 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-text-heading">Followers</h2>
                        <Link to={`/friends?userId=${profile.id}&view=followers`} className="text-sm font-semibold text-primary hover:underline">
                            See all followers ({followerCount})
                        </Link>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-4">
                        {followersPreview.map(follower => (
                            <Link to={`/profile/${follower.id}`} key={follower.id} className="text-center group">
                                <img
                                    src={follower.avatar_url || `https://avatar.vercel.sh/${follower.id}.png`}
                                    alt={follower.name}
                                    className="w-full aspect-square object-cover rounded-lg mb-2 transition-transform duration-300 group-hover:scale-105 shadow-sm"
                                />
                                <p className="text-xs font-semibold text-text-heading truncate group-hover:underline">{follower.name}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-bold text-text-heading mb-4">{isOwner ? "My Posts" : `${profile.name.split(' ')[0]}'s Posts`}</h2>
            <div className="space-y-6">
                {posts.length > 0 ? (
                    posts.map(post => (
                        <PostCard key={post.id} post={post} onPostDeleted={handlePostDeleted} onPostUpdated={fetchProfileAndPosts} />
                    ))
                ) : (
                    <p className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">No posts yet.</p>
                )}
            </div>

            {isEditing && isOwner && (
                <EditProfileModal
                    profile={profile}
                    onClose={() => setIsEditing(false)}
                    onSuccess={handleProfileUpdate}
                />
            )}
            {isVerifying && isOwner && (
                <VerificationModal
                    onClose={() => setIsVerifying(false)}
                    onSuccess={handleVerificationSuccess}
                />
            )}
            {isIcebreakerModalOpen && currentUserProfile && profile && (
                <IcebreakerModal
                    currentUser={currentUserProfile}
                    targetUser={profile}
                    onClose={() => setIsIcebreakerModalOpen(false)}
                    onSelectQuestion={handleSelectIcebreaker}
                />
            )}
        </>
    );
};

export default ProfilePage;
