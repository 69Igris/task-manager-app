'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useState } from 'react';
import { Download, Info, Loader2 } from 'lucide-react';

const INCLUDED = [
  'Equipment and area',
  'Title and description',
  'Priority and status',
  'Assigned users and creator',
  'Due date and completion date',
];

function escapeCSV(str) {
  if (!str) return '';
  const needsQuotes = /[,"\n]/.test(str);
  const escaped = String(str).replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export default function ExportPage() {
  const { fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!dateRange.start || !dateRange.end) return showToast('Select both start and end dates', 'error');

    setLoading(true);
    try {
      const params = new URLSearchParams({ status: 'completed', startDate: dateRange.start, endDate: dateRange.end });
      const response = await fetchWithAuth(`/api/tasks?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch tasks');
      const tasks = data.tasks || [];
      if (tasks.length === 0) { showToast('No completed tasks in that range', 'warning'); return; }

      const headers = ['Equipment', 'Area', 'Title', 'Description', 'Priority', 'Status', 'Assigned to', 'Created by', 'Due date', 'Completed at'];
      const rows = tasks.map((t) => ([
        escapeCSV(t.equipment || 'N/A'),
        escapeCSV(t.area || 'N/A'),
        escapeCSV(t.title || 'N/A'),
        escapeCSV(t.description || 'N/A'),
        t.priority || 'N/A',
        t.status || 'N/A',
        escapeCSV(t.assignedUsers?.map((u) => u.name).join('; ') || 'N/A'),
        escapeCSV(t.creator?.name || 'N/A'),
        t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A',
        t.completedAt ? new Date(t.completedAt).toLocaleDateString() : 'N/A',
      ]));
      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `completed_tasks_${dateRange.start}_to_${dateRange.end}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${tasks.length} tasks`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || !dateRange.start || !dateRange.end;

  return (
    <div className="px-4 lg:px-8 pt-6 pb-10 max-w-2xl">
      <div className="mb-6">
        <h2 className="display-sm" style={{ fontWeight: 500 }}>Export</h2>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Download a CSV of completed tasks for a date range.</p>
      </div>

      <div className="panel p-6 space-y-5">
        <div
          className="flex gap-3 items-start px-4 py-3 rounded"
          style={{
            borderRadius: 'var(--radius-xs)',
            background: 'rgba(0, 112, 204, 0.06)',
            border: '1px solid rgba(0, 112, 204, 0.2)',
          }}
        >
          <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
          <p className="text-xs leading-relaxed text-[color:var(--color-text)]">
            The CSV will include every task marked completed between your selected dates. Opens directly in Excel, Numbers or Sheets.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">From</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">To</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="input-base"
            />
          </div>
        </div>

        <button onClick={handleExport} disabled={disabled} className="btn-primary w-full" style={{ padding: '12px 20px' }}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Exporting</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Export to CSV</span>
            </>
          )}
        </button>

        <div className="pt-4 border-t" style={{ borderColor: 'var(--color-divider)' }}>
          <h4 className="text-xs font-medium text-[color:var(--color-text)] mb-2">What's included</h4>
          <ul className="text-xs space-y-1.5 text-[color:var(--color-text-muted)]">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full" style={{ background: 'var(--color-accent)' }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
