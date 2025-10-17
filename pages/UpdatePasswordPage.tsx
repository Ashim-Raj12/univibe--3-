import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Link, useNavigate } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useAuth } from '../hooks/useAuth';

const UniVibeLogo: React.FC = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary w-8 h-8">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 12C22 9.24 19.76 7 17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 17C19.76 17 22 14.76 22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const UpdatePasswordPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [hasRecoverySession, setHasRecoverySession] = useState(false);
    const navigate = useNavigate();
    const { session, loading: authLoading } = useAuth();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            setHasRecoverySession(true);
          }
        });
    
        return () => subscription.unsubscribe();
    }, []);


    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError(error.message);
        } else {
            setIsSuccess(true);
            setTimeout(() => navigate('/login'), 3000); // Redirect after 3s
        }
        setLoading(false);
    };

    const inputClasses = "w-full px-4 py-3 bg-slate-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-colors";

    const renderContent = () => {
        if (!hasRecoverySession) {
             return (
                 <div className="text-center">
                    <p className="text-text-body">You need a valid password recovery link to access this page. Please request one from the "Forgot Password" page.</p>
                     <Link to="/forgot-password" className="inline-block mt-6 bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary-focus transition-transform hover:scale-105 transform font-semibold shadow-lg">
                        Request Reset Link
                    </Link>
                </div>
            )
        }
        
        if (isSuccess) {
            return (
                 <div className="text-center">
                    <p className="text-text-body font-semibold text-green-600">Your password has been updated successfully!</p>
                    <p className="text-text-muted text-sm mt-2">Redirecting you to the login page...</p>
                </div>
            )
        }

        return (
             <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-text-body mb-1" htmlFor="password">
                        New Password
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`${inputClasses} pr-12`}
                            required
                        />
                         <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 px-4 flex items-center text-text-muted hover:text-text-body rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                        </button>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-text-body mb-1" htmlFor="confirm-password">
                        Confirm New Password
                    </label>
                     <input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputClasses}
                        required
                    />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div>
                    <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center font-semibold">
                        {loading ? <Spinner size="sm" /> : 'Update Password'}
                    </button>
                </div>
            </form>
        )
    }

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
            {!authLoading && session && !hasRecoverySession && (
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
                    <h1 className="text-2xl font-bold text-text-heading mt-4">Create a New Password</h1>
                    <p className="text-text-body">
                        Enter your new password below.
                    </p>
                </div>
                <div className="bg-card p-8 rounded-lg shadow-lg border border-slate-200">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default UpdatePasswordPage;