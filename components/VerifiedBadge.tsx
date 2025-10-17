import React from 'react';

const VerifiedBadge: React.FC<{ size?: string }> = ({ size = 'h-5 w-5' }) => (
  <div className="group relative inline-flex">
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 20 20" 
        fill="currentColor" 
        className={`text-primary ${size}`}
    >
        <path 
            fillRule="evenodd" 
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
            clipRule="evenodd" 
        />
    </svg>
    <div className="absolute bottom-full mb-2 w-max bg-slate-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        Verified Student
    </div>
  </div>
);

export default VerifiedBadge;
