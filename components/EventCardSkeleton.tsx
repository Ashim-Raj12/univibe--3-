import React from 'react';

const EventCardSkeleton: React.FC = () => {
    return (
        <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden shimmer-container">
            <div className="h-32 bg-slate-200"></div>
            <div className="p-4">
                <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
                <div className="h-5 w-3/4 bg-slate-200 rounded mt-2"></div>
                <div className="h-4 w-1/2 bg-slate-200 rounded mt-2"></div>
            </div>
            <div className="flex items-center justify-between mt-auto pt-3 pb-4 px-4 border-t border-slate-200/60">
                <div className="flex items-center">
                    <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
                        <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
                    </div>
                    <div className="h-4 w-16 bg-slate-200 rounded ml-3"></div>
                </div>
                <div className="h-9 w-24 bg-slate-200 rounded-xl"></div>
            </div>
        </div>
    );
};

export default EventCardSkeleton;