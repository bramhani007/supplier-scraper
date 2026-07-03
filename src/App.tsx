import { useState, useCallback } from 'react';
import { Building2, History } from 'lucide-react';
import { SearchForm } from './components/SearchForm';
import { ProgressTracker } from './components/ProgressTracker';
import { ResultsTable } from './components/ResultsTable';
import { ExportPanel } from './components/ExportPanel';
import { StatsPanel } from './components/StatsPanel';
import { useSuppliers, useScraping, useJobs } from './hooks/useScraper';

function App() {
  const { suppliers, isLoading: suppliersLoading, deleteSupplier, clearAllSuppliers } = useSuppliers();
  const { isScraping, isPolling, currentJob, startScraping, resetJob } = useScraping();
  const { jobs, clearAllJobs } = useJobs();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSearch = useCallback(async (city: string, category: string) => {
    try {
      setNotification(null);
      resetJob();
      await clearAllSuppliers();
      await clearAllJobs();
      await startScraping(city, category);
      setNotification({
        type: 'success',
        message: `Scraping completed for ${city}/${category}`,
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  }, [startScraping, resetJob, clearAllSuppliers, clearAllJobs]);

  const clearNotification = () => setNotification(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">IndiaMART Scraper</h1>
            </div>
            <p className="text-sm text-gray-500 tracking-wide">Supplier Data Extraction Tool</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Notification */}
        {notification && (
          <div
            className={`p-4 rounded-xl border ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{notification.message}</p>
              <button
                onClick={clearNotification}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Search Form */}
        <SearchForm onSearch={handleSearch} isLoading={isScraping} categories={[]} />

        {/* Progress Tracker */}
        {(currentJob || isPolling) && (
          <ProgressTracker job={currentJob} isPolling={isPolling} />
        )}

        {/* Stats Panel */}
        {suppliers.length > 0 && <StatsPanel suppliers={suppliers} />}

        {/* Results Section */}
        <div className="space-y-4">
          {suppliers.length > 0 && (
            <ExportPanel suppliers={suppliers} disabled={isScraping} />
          )}
          <ResultsTable suppliers={suppliers} isLoading={suppliersLoading} onDelete={deleteSupplier} />
        </div>

        {/* Jobs History */}
        {jobs.length > 1 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-500" />
              Scraping History
            </h3>
            <div className="space-y-3">
              {jobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{job.city} / {job.category}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(job.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {job.processed_suppliers}/{job.total_suppliers}
                      </p>
                      <p className="text-sm text-gray-500">suppliers</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        job.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : job.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : job.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              IndiaMART Supplier Scraper - Extract supplier data for business intelligence
            </p>
            <p className="text-sm text-gray-400">
              Total suppliers in database: {suppliers.length}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
