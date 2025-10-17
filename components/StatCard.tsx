import React from 'react';
import Spinner from './Spinner';

interface StatCardProps {
    title: string;
    value: number | string | undefined;
    icon: React.ReactNode;
    loading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, loading }) => {
    return (
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                {loading ? (
                    <div className="mt-2">
                        <Spinner size="sm"/>
                    </div>
                ) : (
                    <p className="text-3xl font-bold text-slate-800">{value ?? 'N/A'}</p>
                )}
            </div>
            <div className="bg-blue-100 text-primary p-3 rounded-full">
                {icon}
            </div>
        </div>
    );
};

export default StatCard;