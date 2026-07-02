import React from 'react';
import { FileDown, FileJson, Download } from 'lucide-react';
import { exportToCSV, exportToJSON } from '../utils/export';
import { Supplier } from '../types';

interface ExportPanelProps {
  suppliers: Supplier[];
  disabled: boolean;
}

export function ExportPanel({ suppliers, disabled }: ExportPanelProps) {
  const handleExport = (format: 'csv' | 'json') => {
    const filename = `indiamart-suppliers-${new Date().toISOString().split('T')[0]}`;
    if (format === 'csv') exportToCSV(suppliers, filename);
    else exportToJSON(suppliers, filename);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-700">Export Data</span>
          <span className="text-sm text-gray-500">({suppliers.length} records)</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileDown className="w-4 h-4" />
            CSV
          </button>

          <button
            onClick={() => handleExport('json')}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileJson className="w-4 h-4" />
            JSON
          </button>
        </div>
      </div>
    </div>
  );
}
