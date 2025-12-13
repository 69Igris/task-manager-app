'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useState } from 'react';

export default function ExportPage() {
  const { fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!dateRange.start || !dateRange.end) {
      showToast('Please select both start and end dates', 'error');
      return;
    }

    setLoading(true);
    try {
      // Fetch completed tasks in the date range
      const params = new URLSearchParams({
        status: 'completed',
        startDate: dateRange.start,
        endDate: dateRange.end,
      });

      const response = await fetchWithAuth(`/api/tasks?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tasks');
      }

      const tasks = data.tasks || [];

      if (tasks.length === 0) {
        showToast('No completed tasks found in the selected date range', 'warning');
        return;
      }

      // Generate CSV content
      const csvContent = generateCSV(tasks);

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `completed_tasks_${dateRange.start}_to_${dateRange.end}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Exported ${tasks.length} completed tasks`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast(error.message || 'Failed to export tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateCSV = (tasks) => {
    // CSV Headers
    const headers = [
      'Equipment',
      'Area',
      'Title',
      'Description',
      'Priority',
      'Status',
      'Assigned To',
      'Created By',
      'Due Date',
      'Completed At',
    ];

    // Convert tasks to CSV rows
    const rows = tasks.map((task) => {
      const assignedNames = task.assignedUsers?.map((u) => u.name).join('; ') || 'N/A';
      const creatorName = task.creator?.name || 'N/A';
      const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A';
      const completedAt = task.completedAt
        ? new Date(task.completedAt).toLocaleDateString()
        : 'N/A';

      return [
        escapeCSV(task.equipment || 'N/A'),
        escapeCSV(task.area || 'N/A'),
        escapeCSV(task.title || 'N/A'),
        escapeCSV(task.description || 'N/A'),
        task.priority || 'N/A',
        task.status || 'N/A',
        escapeCSV(assignedNames),
        escapeCSV(creatorName),
        dueDate,
        completedAt,
      ];
    });

    // Combine headers and rows
    const csvLines = [headers, ...rows];
    return csvLines.map((row) => row.join(',')).join('\n');
  };

  const escapeCSV = (str) => {
    if (!str) return '';
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    const needsQuotes = /[,"\n]/.test(str);
    const escaped = str.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Page Title */}
      <div className="px-4 pt-4">
        <h2 className="text-2xl font-bold text-gray-900">Export Tasks</h2>
        <p className="text-sm text-gray-600 mt-1">
          Download completed tasks as CSV file
        </p>
      </div>

      {/* Export Form */}
      <div className="px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex gap-3">
                <span className="text-blue-600 text-2xl">ℹ️</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">
                    How to export
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Select a date range to export all completed tasks within that period.
                    The file will be downloaded as a CSV file which can be opened in Excel.
                  </p>
                </div>
              </div>
            </div>

            {/* Date Range Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Date Range
              </label>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">From</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">To</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={loading || !dateRange.start || !dateRange.end}
              className={`w-full py-4 px-4 rounded-xl font-bold text-white transition-all shadow-lg ${
                loading || !dateRange.start || !dateRange.end
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl active:scale-95'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Exporting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 text-base">
                  <span>📥</span>
                  Export to CSV
                </span>
              )}
            </button>

            {/* Info Box */}
            <div className="pt-4 border-t-2 border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span>📋</span>
                What's included in the export?
              </h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Equipment and Area information
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Task title and description
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Priority and status
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Assigned users and creator
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Due date and completion date
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Sample Preview */}
      <div className="px-4 pb-2">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>👀</span>
            CSV Format Preview
          </h4>
          <div className="bg-white rounded-lg border border-gray-300 p-3 overflow-x-auto">
            <pre className="text-xs text-gray-600 font-mono">
Equipment,Area,Title,Description,Priority,...
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
