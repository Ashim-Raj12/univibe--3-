import React from 'react';

const UserCardSkeleton: React.FC = () => {
    return (
        <div className="bg-card p-5 rounded-2xl shadow-soft border border-slate-200/50 shimmer-container">
            <div className="flex flex-col items-center text-center">
                <div className="bg-slate-200 w-24 h-24 rounded-full mx-auto mb-4"></div>
                <div className="bg-slate-200 h-5 w-3/4 rounded mb-2"></div>
                <div className="bg-slate-200 h-4 w-1/2 rounded mb-2"></div>
                <div className="bg-slate-200 h-3 w-1/3 rounded"></div>
                <div className="bg-slate-200 h-11 w-full rounded-xl mt-6"></div>
            </div>
        </div>
    );
};

export default UserCardSkeleton;