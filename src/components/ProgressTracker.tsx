import React from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, ExternalLink, StopCircle } from 'lucide-react';
import { ScrapingJob } from '../types';

interface ProgressTrackerProps {
  job: ScrapingJob | null;
  isPolling: boolean;
  onStop?: (jobId: number) => void;
}

export function ProgressTracker({ job, isPolling, onStop }: ProgressTrackerProps) {
  if (!job) return null;

  const progress = job.total_suppliers > 0
    ? Math.round((job.processed_suppliers / job.total_suppliers) * 100)
    : 0;

  const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    pending: {
      icon: Clock,
      color: 'text-gray-500',
      bg: 'bg-gray-100',
      label: 'Pending'
    },
    processing: {
      icon: Loader2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      label: 'Processing'
    },
    completed: {
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      label: 'Completed'
    },
    failed: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      label: 'Failed'
    },
    cancelled: {
      icon: StopCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      label: 'Stopped'
    },
  };

  const status = statusConfig[job.status] ?? statusConfig.pending;
  const StatusIcon = status.icon;

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getDuration = () => {
    if (!job.started_at) return '--';
    const start = new Date(job.started_at).getTime();
    const end = job.completed_at ? new Date(job.completed_at).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  const barColor =
    job.status === 'completed' ? 'bg-emerald-500' :
    job.status === 'failed'    ? 'bg-red-500'     :
    job.status === 'cancelled' ? 'bg-orange-400'  : 'bg-blue-500';

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className={`px-6 py-4 ${status.bg} border-b`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon
              className={`w-5 h-5 ${status.color} ${job.status === 'processing' ? 'animate-spin' : ''}`}
            />
            <div>
              <h3 className="font-semibold text-gray-900">
                Scraping: {job.city} / {job.category}
              </h3>
              <p className={`text-sm ${status.color}`}>
                {status.label}
                {isPolling && job.status === 'processing' && ' - Updating...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{job.processed_suppliers}</div>
              <div className="text-sm text-gray-500">of {job.total_suppliers} suppliers</div>
            </div>

            {job.status === 'processing' && onStop && (
              <button
                onClick={() => onStop(job.id)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
              >
                <StopCircle className="w-4 h-4" />
                Stop
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">{progress}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${barColor}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500 mb-1">Started</div>
            <div className="font-medium text-gray-900">{formatTime(job.started_at)}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500 mb-1">Duration</div>
            <div className="font-medium text-gray-900">{getDuration()}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500 mb-1">Completed</div>
            <div className="font-medium text-gray-900">{formatTime(job.completed_at)}</div>
          </div>
        </div>

        {job.current_url && job.status === 'processing' && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              <span className="truncate font-mono text-xs">{job.current_url}</span>
            </div>
          </div>
        )}

        {job.status === 'cancelled' && (
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-700 font-medium">
              Scraping stopped — {job.processed_suppliers} supplier{job.processed_suppliers !== 1 ? 's' : ''} collected so far are saved.
            </p>
          </div>
        )}

        {job.error_message && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-700">{job.error_message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
