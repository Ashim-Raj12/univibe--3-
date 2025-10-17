import React from 'react';
import PostForm from './PostForm';

interface CreatePostModalProps {
    onClose: () => void;
    onNewPost: () => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose, onNewPost }) => {
    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-background rounded-2xl shadow-xl w-full max-w-lg animate-scale-in"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-heading">Create Post</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-heading">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-2 sm:p-0">
                    <PostForm onNewPost={onNewPost} />
                </div>
            </div>
        </div>
    );
};

export default CreatePostModal;