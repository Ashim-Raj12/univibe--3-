import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';

const reportReasons = [
  'Spam or Misleading',
  'Harassment or Bullying',
  'Hate Speech',
  'Inappropriate Content',
  'Impersonation',
  'Other (please specify)',
];

interface ReportModalProps {
  entityType: 'profile' | 'post' | 'comment' | 'message';
  entityId: string | number;
  onClose: () => void;
  onSuccess: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ entityType, entityId, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState(reportReasons[0]);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    const reportReason = reason === 'Other (please specify)' ? details : reason;
    if (!reportReason.trim()) {
        setError('Please provide a reason for the report.');
        setLoading(false);
        return;
    }

    const { error: insertError } = await supabase.from('reports').insert({
      reporter_id: user.id,
      entity_type: entityType,
      entity_id: String(entityId),
      reason: reportReason,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  const inputClasses = "w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-heading">Report Content</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-heading">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-text-body">Why are you reporting this? Your report is anonymous to other users.</p>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)} className={inputClasses}>
              {reportReasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {reason === 'Other (please specify)' && (
            <div>
              <label className="block text-sm font-medium text-text-body mb-1">Details</label>
              <textarea value={details} onChange={e => setDetails(e.target.value)} className={inputClasses} rows={3} required />
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="bg-slate-100 text-text-body px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold">Cancel</button>
            <button type="submit" disabled={loading} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold">
              {loading ? <Spinner size="sm" /> : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;