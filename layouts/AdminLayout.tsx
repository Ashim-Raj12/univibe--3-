import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';

const AdminLayout: React.FC = () => {
    const { user, loading, signOut } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const adminEmails = ['sumitkumar050921@gmail.com', 'admin.univibe@example.com'];

    React.useEffect(() => {
        if (!loading && (!user?.email || !adminEmails.includes(user.email))) {
            navigate('/home', { replace: true });
        }
    }, [loading, user, navigate]);

    if (loading || !user?.email || !adminEmails.includes(user.email)) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Spinner size="lg" />
            </div>
        );
    }

    const handleSignOut = async () => {
        setIsMobileMenuOpen(false);
        await signOut();
        navigate('/login', { replace: true });
    };

    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive
                ? 'bg-primary text-white'
                : 'text-slate-700 hover:bg-slate-200'
        }`;

    const renderNavLinks = () => (
        <nav className="flex-grow space-y-1">
             <NavLink to="/admin/dashboard" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</NavLink>
             <NavLink to="/admin/verification" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Verification</NavLink>
             <NavLink to="/admin/users" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>User Management</NavLink>
             <NavLink to="/admin/communities" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Communities</NavLink>
             <NavLink to="/admin/posts" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Post Moderation</NavLink>
             <NavLink to="/admin/colleges" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>College Management</NavLink>
             <NavLink to="/admin/reports" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Reports</NavLink>
             <NavLink to="/admin/feedback" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Feedback</NavLink>
             <NavLink to="/admin/team" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Team Management</NavLink>
        </nav>
    );
    
    const icons = {
        logout: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
        back: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>,
    };

    return (
        <div className="min-h-screen bg-slate-100 md:flex">
            <header className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-20">
                <h1 className="text-lg font-bold text-slate-800">Admin Panel</h1>
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                </button>
            </header>

            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="bg-white w-64 h-full p-4 shadow-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h1 className="text-xl font-bold text-slate-800">Admin Menu</h1>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="mb-4">
                            <NavLink to="/home" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-200" onClick={() => setIsMobileMenuOpen(false)}>
                                {icons.back} <span>Back to App</span>
                            </NavLink>
                        </div>
                        {renderNavLinks()}
                        <div className="mt-auto pt-4 border-t border-slate-200 space-y-2">
                             <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                                {icons.logout} <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 bg-white border-r border-slate-200 p-4">
                <div className="py-4 mb-4">
                    <h1 className="text-xl font-bold text-slate-800">Admin Panel</h1>
                </div>
                <div className="mb-4 pb-4 border-b border-slate-200">
                    <NavLink to="/home" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-200">
                        {icons.back} <span>Back to App</span>
                    </NavLink>
                </div>
                {renderNavLinks()}
                <div className="mt-auto pt-4 border-t border-slate-200 space-y-2">
                    <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                        {icons.logout} <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 md:ml-64">
                <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
                     <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;