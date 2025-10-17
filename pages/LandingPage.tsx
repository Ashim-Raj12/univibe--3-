import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MagicCard from '../components/MagicCard';
import { MagicGrid } from '../components/MagicGrid';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';

const UniVibeLogo: React.FC<{ size?: string }> = ({ size = 'h-10 w-10'}) => (
     <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`text-primary ${size}`}>
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 12C22 9.24 19.76 7 17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 17C19.76 17 22 14.76 22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <MagicCard>
        <div className="bg-card p-6 rounded-2xl shadow-soft border border-slate-200/50 text-left h-full">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-soft">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-text-heading mt-5">{title}</h3>
            <p className="mt-2 text-text-body">{description}</p>
        </div>
    </MagicCard>
);


const LandingPage: React.FC = () => {
    const { session, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && session) {
            navigate('/home', { replace: true });
        }
    }, [session, loading, navigate]);

    if (loading || session) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-text-body flex flex-col">
            <header className="sticky top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-b border-slate-200/50 py-4">
                 <div className="container mx-auto flex justify-between items-center px-4 sm:px-6">
                     <Link to="/" className="flex items-center gap-2 text-xl font-bold text-text-heading">
                        <UniVibeLogo size="h-8 w-8"/>
                        <span>UniVibe</span>
                    </Link>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <Link to="/login" className="font-semibold text-text-body hover:text-primary transition-colors px-3 py-2 rounded-md">Login</Link>
                        <Link to="/register" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-focus transition-colors font-semibold shadow-soft hover:shadow-soft-md">Sign Up</Link>
                    </div>
                </div>
            </header>

            <main className="relative flex-grow flex items-center justify-center pt-20 pb-12 overflow-hidden">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-50 to-background"></div>
                <div className="text-center p-6">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-text-heading leading-tight">
                        Connect with your <br/> <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Campus Community</span>.
                    </h1>
                     <p className="mt-4 max-w-2xl mx-auto text-lg text-text-body">
                        UniVibe helps you find future classmates, discover compatible roommates, and build friendships before you even step on campus.
                    </p>
                    <div className="mt-8">
                        <Link to="/register" className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl hover:bg-primary-focus transition-all duration-300 hover:scale-105 transform text-lg font-semibold shadow-soft-md hover:shadow-soft-lg active:scale-100">
                            Get Started
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </Link>
                    </div>
                </div>
            </main>

             <section className="py-16 md:py-24 bg-card/50 border-t border-slate-200/50">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold text-text-heading">Your College Journey Starts Here</h2>
                    <p className="mt-2 text-lg text-text-body max-w-3xl mx-auto">UniVibe is more than a social network; it's your launchpad for an unforgettable college experience.</p>
                    
                    <MagicGrid>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
                            <FeatureCard 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                                title="Find Future Classmates"
                                description="Search and filter to discover students from your college and state. Break the ice and build friendships before you even step on campus."
                            />
                            <FeatureCard 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                                title="Join Interest Communities"
                                description="Discover or create communities for your hobbies, major, or clubs. It's the perfect way to find your niche and get involved in campus life."
                            />
                            <FeatureCard 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                                title="Share Your Experience"
                                description="Post updates, photos, and moments to the main feed. See what your new friends are up to and stay connected with the campus pulse."
                            />
                            <FeatureCard 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                                title="Connect Privately"
                                description="Once you've made a connection, start a one-on-one conversation with our secure and easy-to-use private messaging."
                            />
                        </div>
                    </MagicGrid>
                </div>
            </section>
            
             <footer className="py-8 bg-slate-100/50 text-center text-sm text-text-muted">
                <p>&copy; {new Date().getFullYear()} UniVibe. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;