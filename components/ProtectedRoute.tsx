import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navbar from './Navbar';
import Spinner from './Spinner';

const ProtectedRoute: React.FC = () => {
    const { session, profile, user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!session || !user) {
        return <Navigate to="/" replace />;
    }

    // Handle parent users
    if (profile?.enrollment_status === 'parent') {
        const parentAllowedPaths = ['/common-room', `/profile/${user.id}`, '/chat', `/chat/${profile.id}`, '/about', '/feedback'];
        const isPathAllowedForParent = parentAllowedPaths.some(p => location.pathname.startsWith(p.replace(profile.id, user.id)));
        
        if (!isPathAllowedForParent) {
            return <Navigate to="/common-room" replace />;
        }
    } else {
        // Handle student users (exploring, current, alumni)
        const isProfileIncomplete = profile && !profile.college;
        const studentAllowedPaths = [`/profile/${user.id}`, '/about', '/feedback'];
        const isAllowedForIncomplete = studentAllowedPaths.includes(location.pathname);
        
        if (isProfileIncomplete && !isAllowedForIncomplete) {
            // Redirect to their own profile page if it's incomplete and they are trying to access other pages.
            return <Navigate to={`/profile/${user.id}`} replace />;
        }
    }

    const isFullHeightPage = location.pathname.startsWith('/chat/') || location.pathname.startsWith('/group/');

    return (
        <div className="h-screen bg-background text-text-body flex flex-col md:flex-row">
            <Navbar />
            <main className="flex-1 md:ml-64 overflow-y-auto">
                <div className={`animate-fade-in-up ${isFullHeightPage 
                    ? 'h-full' 
                    : 'container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}`}>
                     <Outlet />
                </div>
            </main>
        </div>
    );
};

export default ProtectedRoute;
