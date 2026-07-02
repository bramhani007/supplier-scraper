import React from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import { ScrapingJob } from '../types';

interface ProgressTrackerProps {
  job: ScrapingJob | null;
  isPolling: boolean;
}

export function ProgressTracker({ job, isPolling }: ProgressTrackerProps) {
  if (!job) return null;

  const progress = job.total_suppliers > 0
    ? Math.round((job.processed_suppliers / job.total_suppliers) * 100)
    : 0;

  const statusConfig = {
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
    }
  };

  const status = statusConfig[job.status] || statusConfig.pending;
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
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className={`px-6 py-4 ${status.bg} border-b`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-5 h-5 ${status.color} ${job.status === 'processing' ? 'animate-spin' : ''}`} />
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
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{job.processed_suppliers}</div>
            <div className="text-sm text-gray-500">of {job.total_suppliers} suppliers</div>
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
              className={`h-full transition-all duration-500 ${
                job.status === 'completed' ? 'bg-emerald-500' :
                job.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
              }`}
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

        {job.error_message && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-700">{job.error_message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
