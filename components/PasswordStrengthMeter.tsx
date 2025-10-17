import React from 'react';

interface PasswordStrengthMeterProps {
    password?: string;
}

const calculatePasswordStrength = (password: string): { score: number; label: string } => {
    if (!password) {
        return { score: 0, label: '' };
    }
    
    if (password.length > 0 && password.length < 8) {
        return { score: 1, label: 'Weak' };
    }

    let points = 0;
    if (password.length >= 8) points++;
    if (/[a-z]/.test(password)) points++;
    if (/[A-Z]/.test(password)) points++;
    if (/\d/.test(password)) points++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) points++;

    let score = 0;
    let label = '';
    
    // This switch is for passwords with length >= 8
    switch (points) {
        case 0: // Should not happen if length >= 8
        case 1:
            score = 1;
            label = 'Weak';
            break;
        case 2:
            score = 2;
            label = 'Medium';
            break;
        case 3:
        case 4:
            score = 3;
            label = 'Good';
            break;
        case 5:
            score = 4;
            label = 'Strong';
            break;
        default:
            score = 1;
            label = 'Weak';
    }

    return { score, label };
};


const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password = '' }) => {
    const { score, label } = calculatePasswordStrength(password);

    if (password.length === 0) {
        return null;
    }

    const getBarColor = (s: number) => {
        switch (s) {
            case 1:
                return 'bg-red-500';
            case 2:
                return 'bg-orange-400';
            case 3:
                return 'bg-yellow-400';
            case 4:
                return 'bg-green-500';
            default:
                return 'bg-slate-200';
        }
    };

    return (
        <div className="mt-2 space-y-1">
            <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div
                        key={index}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                            index < score ? getBarColor(score) : 'bg-slate-200'
                        }`}
                    />
                ))}
            </div>
            {label && (
                <p className={`text-xs font-medium text-right ${
                    score === 1 ? 'text-red-500' :
                    score === 2 ? 'text-orange-400' :
                    score === 3 ? 'text-yellow-500' :
                    score === 4 ? 'text-green-500' : 'text-text-muted'
                }`}>
                    {label}
                </p>
            )}
        </div>
    );
};

export default PasswordStrengthMeter;
