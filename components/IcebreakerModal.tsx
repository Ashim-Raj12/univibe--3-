import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import Spinner from './Spinner';
import { GoogleGenAI } from '@google/genai';

interface IcebreakerModalProps {
    currentUser: Profile;
    targetUser: Profile;
    onClose: () => void;
    onSelectQuestion: (question: string) => void;
}

const IcebreakerModal: React.FC<IcebreakerModalProps> = ({ currentUser, targetUser, onClose, onSelectQuestion }) => {
    const [icebreakers, setIcebreakers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const generateIcebreakers = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!process.env.API_KEY) {
                // Fallback questions if API key is not set
                const fallbackQuestions = [
                    `Hey! What's your favorite thing about studying at ${targetUser.college || 'our college'}?`,
                    "What's a class you're really excited about this semester?",
                    "Any cool campus spots I should definitely check out?",
                ];
                setIcebreakers(fallbackQuestions);
                setLoading(false);
                return;
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const buildPrompt = () => {
                let prompt = `You are a friendly and creative assistant for a college social network. My name is ${currentUser.name}. I want to send a message to ${targetUser.name}.`;

                if (currentUser.college && currentUser.college === targetUser.college) {
                    prompt += ` We both go to ${currentUser.college}.`;
                }
                if (currentUser.course && currentUser.course === targetUser.course) {
                    prompt += ` We are both studying ${currentUser.course}.`;
                }
                if (currentUser.hobbies_interests && targetUser.hobbies_interests) {
                    const myHobbies = currentUser.hobbies_interests.split(',').map(h => h.trim().toLowerCase());
                    const theirHobbies = targetUser.hobbies_interests.split(',').map(h => h.trim().toLowerCase());
                    const sharedHobbies = myHobbies.filter(h => theirHobbies.includes(h));
                    if (sharedHobbies.length > 0) {
                        prompt += ` We share interests like ${sharedHobbies.join(', ')}.`;
                    }
                }

                prompt += `\n\nBased on this information, generate 3 fun and engaging icebreaker questions I can ask them. The questions should be casual and friendly. Do not include any introductory text or quotation marks, just provide the questions as a numbered list (e.g., "1. Question one?").`;
                return prompt;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: buildPrompt(),
            });
            
            const text = response.text;
            const questions = text.split('\n').map(q => q.replace(/^\d+\.\s*/, '').trim()).filter(q => q.length > 0 && q.length < 150);
            
            if (questions.length === 0) {
                throw new Error("Couldn't generate icebreakers. Try again.");
            }

            setIcebreakers(questions);
        } catch (err: any) {
            console.error("Gemini API error:", err);
            setError(err.message || "Failed to generate icebreakers. Please try again later.");
             const fallbackQuestions = [
                `Hey! What's your favorite thing about studying at ${targetUser.college || 'our college'}?`,
                "What's a class you're really excited about this semester?",
                "Any cool campus spots I should definitely check out?",
            ];
            setIcebreakers(fallbackQuestions);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        generateIcebreakers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-heading flex items-center gap-2">
                        ✨ Icebreakers for {targetUser.name.split(' ')[0]}
                    </h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-heading p-1 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 min-h-[200px] flex flex-col justify-center">
                    {loading ? (
                        <div className="flex justify-center items-center flex-col gap-2">
                            <Spinner />
                            <p className="text-sm text-text-muted">Generating ideas...</p>
                        </div>
                    ) : error ? (
                         <div className="text-center text-red-500">
                            <p>{error}</p>
                            <p className="text-sm text-text-body mt-2">Here are some classics instead:</p>
                             <div className="mt-4 space-y-3">
                                {icebreakers.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onSelectQuestion(q)}
                                        className="w-full text-left p-3 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-text-body"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {icebreakers.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => onSelectQuestion(q)}
                                    className="w-full text-left p-3 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-text-body"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                 <div className="p-4 border-t border-slate-200 text-right">
                    <button
                        onClick={generateIcebreakers}
                        disabled={loading}
                        className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors font-semibold text-sm disabled:opacity-50 flex items-center gap-2 ml-auto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l5 5M20 20l-5-5" /></svg>
                        Generate More
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IcebreakerModal;