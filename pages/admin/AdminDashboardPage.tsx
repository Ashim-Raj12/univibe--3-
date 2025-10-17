import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import StatCard from '../../components/StatCard';
import { usePresence } from '../../contexts/PresenceContext';

const AdminDashboardPage: React.FC = () => {
    const [stats, setStats] = useState<{ total_users: number | null; posts_today: number | null; total_communities: number | null; } | null>(null);
    const [loading, setLoading] = useState(true);
    const { onlineUsers } = usePresence();

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('daily_stats')
                .select('*')
                .single();
            
            if (error) {
                console.error("Error fetching stats:", error);
            } else {
                setStats(data);
            }
            setLoading(false);
        };
        fetchStats();
    }, []);

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Live Users"
                    value={onlineUsers.size}
                    loading={false}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                />
                <StatCard
                    title="Total Users"
                    value={stats?.total_users ?? 0}
                    loading={loading}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                />
                <StatCard
                    title="Posts Today"
                    value={stats?.posts_today ?? 0}
                    loading={loading}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                />
                 <StatCard
                    title="Total Communities"
                    value={stats?.total_communities ?? 0}
                    loading={loading}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                />
            </div>
        </div>
    );
};

export default AdminDashboardPage;