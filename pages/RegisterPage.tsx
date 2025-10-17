import React, { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import { indianStatesAndUTs } from '../data/states';
import { useAuth } from '../hooks/useAuth';

const UniVibeLogo: React.FC = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary w-8 h-8">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 12C22 9.24 19.76 7 17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 17C19.76 17 22 14.76 22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

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

const RegisterPage: React.FC = () => {
    const [userType, setUserType] = useState<'admitted' | 'exploring' | 'parent'>('admitted');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');

    const [college, setCollege] = useState('');
    const [collegeInput, setCollegeInput] = useState('');
    const [filteredColleges, setFilteredColleges] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const collegeDropdownRef = useRef<HTMLDivElement>(null);

    const [allColleges, setAllColleges] = useState<string[]>([]);
    const [collegesLoading, setCollegesLoading] = useState(true);
    const [state, setState] = useState('');
    const [enrollmentStatus, setEnrollmentStatus] = useState<'current_student' | 'incoming_student' | 'passed_out' | ''>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const [usernameLoading, setUsernameLoading] = useState(false);
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const { session, loading: authLoading } = useAuth();

    useEffect(() => {
        const fetchColleges = async () => {
          setCollegesLoading(true);
          const { data, error } = await supabase.from('colleges').select('name').order('name', { ascending: true });
          if (error) {
            console.error("Failed to fetch colleges:", error);
          } else if (data) {
            setAllColleges(data.map(c => c.name));
          }
          setCollegesLoading(false);
        };
        fetchColleges();
      }, []);

    useEffect(() => {
        if (!isDropdownOpen) {
            setFilteredColleges([]);
            return;
        }
        const filtered = allColleges.filter(c =>
            c.toLowerCase().includes(collegeInput.toLowerCase())
        );
        setFilteredColleges(filtered.slice(0, 100));
    }, [collegeInput, allColleges, isDropdownOpen]);
    
     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (collegeDropdownRef.current && !collegeDropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
                if (college) {
                    setCollegeInput(college);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [college]);

    const handleCollegeSelect = (selected: string) => {
        setCollege(selected);
        setCollegeInput(selected);
        setIsDropdownOpen(false);
    };

    const handleCollegeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCollegeInput(value);
        setCollege(''); // Clear valid selection when user types again
        if (!isDropdownOpen) {
            setIsDropdownOpen(true);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const checkUsername = useCallback(debounce(async (uname: string) => {
        setUsernameLoading(true);
        if (uname.length > 0) {
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
    }, 500), []);

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        setUsername(value);
        if (value.length > 0) {
            setUsernameLoading(true);
            checkUsername(value);
        } else {
            setUsernameError(null);
            setUsernameLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (usernameError || usernameLoading) {
            setError("Please fix the errors before submitting.");
            return;
        }

        if (userType === 'admitted') {
             if (!college) {
                setError("Please select a valid college from the list.");
                return;
            }
            if (!enrollmentStatus) {
                setError("Please select your enrollment status.");
                return;
            }
        }

        setLoading(true);
        setError(null);

        let signUpData: any = {};

        switch (userType) {
            case 'admitted':
                signUpData = {
                    name,
                    username,
                    college: toTitleCase(college),
                    state,
                    enrollment_status: enrollmentStatus,
                };
                break;
            case 'exploring':
                signUpData = {
                    name,
                    username,
                    college: null,
                    state: null,
                    enrollment_status: null,
                };
                break;
            case 'parent':
                 signUpData = {
                    name,
                    username,
                    college: null,
                    state: null,
                    enrollment_status: 'parent',
                };
                break;
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin,
                data: signUpData,
            },
        });

        if (error) {
            setError(error.message);
        } else {
            setIsSuccess(true);
        }
        
        setLoading(false);
    };

    const inputClasses = "w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300";
    
    const isSubmitDisabled = loading || usernameLoading || !!usernameError || !username || !name ||
    (userType === 'admitted' && (!college || !enrollmentStatus || !state));

    const UserTypeButton: React.FC<{
        onClick: () => void;
        selected: boolean;
        icon: React.ReactNode;
        title: string;
        subtitle: string;
    }> = ({ onClick, selected, icon, title, subtitle }) => (
        <button
            type="button"
            onClick={onClick}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 flex items-center gap-4 ${selected ? 'bg-primary/5 border-primary shadow-soft' : 'bg-transparent border-slate-200 hover:border-slate-300'}`}
        >
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${selected ? 'bg-primary text-white' : 'bg-slate-100 text-text-muted'}`}>
                {icon}
            </div>
            <div>
                <p className={`font-semibold ${selected ? 'text-primary' : 'text-text-heading'}`}>{title}</p>
                <p className="text-xs text-text-body">{subtitle}</p>
            </div>
        </button>
    );

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
            {!authLoading && session && (
                <Link to="/home" className="absolute top-4 right-4 bg-slate-100 text-text-body px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-200 transition-colors z-10">
                    &larr; Back to App
                </Link>
            )}
             <div className="w-full max-w-md">
                <div className="text-center mb-8">
                     <Link to="/" className="inline-flex items-center gap-2 text-3xl font-bold text-text-heading">
                        <UniVibeLogo />
                        <span>UniVibe</span>
                    </Link>
                    <h1 className="text-2xl font-bold text-text-heading mt-4">
                        {isSuccess ? 'Almost there!' : 'Create Your Account'}
                    </h1>
                    <p className="text-text-body">
                        {isSuccess ? `We've sent a confirmation link to ${email}.` : 'Join UniVibe and start connecting!'}
                    </p>
                </div>

                {isSuccess ? (
                    <div className="bg-card p-8 rounded-2xl shadow-soft-md border border-slate-200/50 text-center space-y-4">
                        <p className="text-text-body">Please click the link in the email to finish setting up your account.</p>
                        <Link to="/login" className="inline-block bg-primary text-white px-8 py-3 rounded-xl hover:bg-primary-focus transition-transform hover:scale-105 transform font-semibold shadow-soft hover:shadow-soft-md active:scale-100">
                            Go to Login
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="bg-card p-8 rounded-2xl shadow-soft-md border border-slate-200/50">
                            <form onSubmit={handleRegister} className="space-y-4">
                                
                                <div className="space-y-3">
                                    <UserTypeButton 
                                        onClick={() => setUserType('admitted')}
                                        selected={userType === 'admitted'}
                                        title="I'm a Student"
                                        subtitle="I have a college and I'm ready to connect."
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
                                    />
                                    <UserTypeButton 
                                        onClick={() => setUserType('parent')}
                                        selected={userType === 'parent'}
                                        title="I'm a Parent"
                                        subtitle="I want to stay connected with the community."
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                                    />
                                     <UserTypeButton 
                                        onClick={() => setUserType('exploring')}
                                        selected={userType === 'exploring'}
                                        title="I'm Exploring"
                                        subtitle="I'm looking for colleges and connections."
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>}
                                    />
                                </div>
                                <hr className="border-slate-200/60 my-4"/>

                                <div className="animate-fade-in-up space-y-4" style={{animationDuration: '0.5s'}}>
                                    <div>
                                        <label className="block text-sm font-medium text-text-body mb-2" htmlFor="name">
                                            Full Name
                                        </label>
                                        <input
                                            id="name"
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className={inputClasses}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-body mb-2" htmlFor="username">
                                        Username
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="username"
                                            type="text"
                                            value={username}
                                            onChange={handleUsernameChange}
                                            className={inputClasses}
                                            required
                                            maxLength={15}
                                        />
                                        {usernameLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner size="sm" /></div>}
                                    </div>
                                    {usernameError ? (
                                        <p className="text-red-500 text-xs mt-1">{usernameError}</p>
                                    ) : username.length > 2 && !usernameLoading && (
                                        <p className="text-green-600 text-xs mt-1">Username available!</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-body mb-2" htmlFor="email">
                                        Email Address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={inputClasses}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-body mb-2" htmlFor="password">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`${inputClasses} pr-12`}
                                            required
                                            minLength={6}
                                            placeholder="Min. 8 characters"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 px-4 flex items-center text-text-muted hover:text-text-body rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <PasswordStrengthMeter password={password} />
                                </div>

                                {userType === 'admitted' && (
                                     <div className="animate-fade-in-up space-y-4" style={{animationDuration: '0.5s'}}>
                                        <div>
                                            <label className="block text-sm font-medium text-text-body mb-2" htmlFor="state">
                                                State / Union Territory
                                            </label>
                                            <select
                                                id="state"
                                                value={state}
                                                onChange={(e) => setState(e.target.value)}
                                                className={inputClasses}
                                                required={userType === 'admitted'}
                                            >
                                                <option value="" disabled>Select your state...</option>
                                                {indianStatesAndUTs.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div ref={collegeDropdownRef} className="relative">
                                            <label className="block text-sm font-medium text-text-body mb-2" htmlFor="college">
                                                College / University / Institute
                                            </label>
                                            <input
                                                id="college"
                                                type="text"
                                                value={collegeInput}
                                                onChange={handleCollegeInputChange}
                                                onFocus={() => setIsDropdownOpen(true)}
                                                className={inputClasses}
                                                placeholder={collegesLoading ? 'Loading colleges...' : 'Search for your college...'}
                                                required={userType === 'admitted'}
                                                disabled={collegesLoading}
                                                autoComplete="off"
                                            />
                                            {isDropdownOpen && (
                                                <div className="absolute z-10 w-full mt-1 bg-card border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                    {filteredColleges.length > 0 ? (
                                                        filteredColleges.map(c => (
                                                            <button
                                                                type="button"
                                                                key={c}
                                                                onClick={() => handleCollegeSelect(c)}
                                                                className="w-full text-left px-4 py-2 text-sm text-text-body hover:bg-slate-100"
                                                            >
                                                                {c}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <p className="px-4 py-2 text-sm text-text-muted">
                                                            {collegeInput ? "No results found." : "Start typing to search..."}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-body mb-2" htmlFor="enrollment_status">
                                                Enrollment Status
                                            </label>
                                            <select
                                                id="enrollment_status"
                                                value={enrollmentStatus}
                                                onChange={(e) => setEnrollmentStatus(e.target.value as any)}
                                                className={inputClasses}
                                                required={userType === 'admitted'}
                                            >
                                                <option value="" disabled>Select your status...</option>
                                                <option value="incoming_student">Future Student</option>
                                                <option value="current_student">Current Student</option>
                                                <option value="passed_out">Alumni / Passed Out</option>
                                            </select>
                                        </div>
                                    </div>
                                )}


                                {error && <p className="text-red-500 text-sm">{error}</p>}
                                <div>
                                    <button type="submit" disabled={isSubmitDisabled} className="w-full bg-primary text-white py-3 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:bg-slate-400 flex items-center justify-center font-semibold mt-2 shadow-soft hover:shadow-soft-md hover:-translate-y-0.5 transform active:scale-95">
                                        {loading ? <Spinner size="sm" /> : 'Create Account'}
                                    </button>
                                </div>
                            </form>
                        </div>
                        <p className="mt-6 text-center text-sm text-text-body">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-primary hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </>
                )}
             </div>
        </div>
    );
};

export default RegisterPage;