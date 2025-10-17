import React from 'react';

const PostCardSkeleton: React.FC = () => {
    return (
        <div className="bg-card p-5 sm:p-6 rounded-2xl shadow-soft border border-slate-200/50 shimmer-container">
            <div>
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 w-full">
                        <div className="bg-slate-200 h-11 w-11 rounded-full flex-shrink-0"></div>
                        <div className="w-full mt-1">
                            <div className="bg-slate-200 h-4 w-1/3 rounded"></div>
                            <div className="bg-slate-200 h-3 w-1/4 rounded mt-2"></div>
                        </div>
                    </div>
                </div>
                <div className="my-5 space-y-2">
                    <div className="bg-slate-200 h-4 w-full rounded"></div>
                    <div className="bg-slate-200 h-4 w-5/6 rounded"></div>
                </div>
                <div className="pt-3 mt-4 flex items-center gap-2 border-t border-slate-200/60">
                    <div className="bg-slate-200 h-8 w-16 rounded-xl"></div>
                    <div className="bg-slate-200 h-8 w-24 rounded-xl"></div>
                </div>
            </div>
        </div>
    );
};

export default PostCardSkeleton;