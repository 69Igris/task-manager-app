'use client';

import { useState } from 'react';
import {
  AlertTriangle, ArrowRight, Bell, CheckCircle2, Loader2, MessageSquare,
  MinusCircle, Pencil, Plus, RefreshCw, Trash2, XCircle,
} from 'lucide-react';

const KIND = {
  create: { Icon: Plus, label: 'Create task' },
  update: { Icon: Pencil, label: 'Update task' },
  status: { Icon: RefreshCw, label: 'Change status' },
  comment: { Icon: MessageSquare, label: 'Add comment' },
  delete: { Icon: Trash2, label: 'Delete task' },
  reminder: { Icon: Bell, label: 'Send reminder' },
};

const STATUS = {
  pending: { label: 'Awaiting your approval', className: 'tag tag-accent' },
  executing: { label: 'Running…', className: 'tag tag-accent' },
  executed: { label: 'Executed', className: 'tag tag-success' },
  partially_failed: { label: 'Partially failed', className: 'tag tag-warn' },
  failed: { label: 'Failed', className: 'tag tag-urgent' },
  cancelled: { label: 'Cancelled', className: 'tag' },
  expired: { label: 'Expired', className: 'tag' },
};

const FIELD_LABELS = {
  project: 'Project', area: 'Area', priority: 'Priority', dueDate: 'Due', assignees: 'Assignees',
  description: 'Description', status: 'Status', title: 'Title', comment: 'Comment', when: 'When', recipients: 'Notify',
};

function fmt(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ') || '—';
  return String(value);
}

function ResultIcon({ status }) {
  if (status === 'succeeded') return <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#0a7d3a' }} />;
  if (status === 'failed') return <XCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--color-danger)' }} />;
  return <MinusCircle className="h-4 w-4 shrink-0 text-[color:var(--color-text-subtle)]" />;
}

function ActionPreview({ preview }) {
  const rows = [];
  if (preview.fields) {
    for (const [k, v] of Object.entries(preview.fields)) {
      if (k === 'description' && !v) continue;
      rows.push(
        <div key={k} className="flex gap-2">
          <dt className="w-20 shrink-0 text-[color:var(--color-text-muted)]">{FIELD_LABELS[k] || k}</dt>
          <dd className="min-w-0 break-words">{fmt(v)}</dd>
        </div>
      );
    }
  }
  if (preview.after) {
    for (const [k, v] of Object.entries(preview.after)) {
      const before = preview.before?.[k];
      rows.push(
        <div key={k} className="flex gap-2">
          <dt className="w-20 shrink-0 text-[color:var(--color-text-muted)]">{FIELD_LABELS[k] || k}</dt>
          <dd className="min-w-0 break-words flex flex-wrap items-center gap-1.5">
            {preview.before && (
              <>
                <span className="line-through text-[color:var(--color-text-subtle)]">{fmt(before)}</span>
                <ArrowRight className="h-3 w-3 text-[color:var(--color-text-subtle)]" />
              </>
            )}
            <span>{fmt(v)}</span>
          </dd>
        </div>
      );
    }
  }
  return (
    <>
      {rows.length > 0 && <dl className="mt-1.5 space-y-1 text-[12.5px]">{rows}</dl>}
      {preview.notes?.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-[12px]" style={{ color: '#a86400' }}>
          {preview.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </>
  );
}

export default function ProposalCard({ proposal, onApprove, onReject, busy }) {
  const [selected, setSelected] = useState(() => new Set(proposal.actions.map((a) => a.id)));
  const pending = proposal.status === 'pending';
  const results = new Map((proposal.results || []).map((r) => [r.actionId, r]));
  const status = STATUS[proposal.status] || STATUS.pending;
  const hasDestructive = proposal.actions.some((a) => a.risk === 'destructive');

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="card mt-3 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-divider)' }}>
        <div className="min-w-0">
          <p className="text-[13px] font-medium">Proposed changes</p>
          <p className="text-[12px] text-[color:var(--color-text-muted)] truncate">{proposal.summary}</p>
        </div>
        <span className={status.className}>{status.label}</span>
      </div>

      <ul className="divide-y" style={{ borderColor: 'var(--color-divider)' }}>
        {proposal.actions.map((action) => {
          const kind = KIND[action.preview.kind] || KIND.update;
          const result = results.get(action.id);
          return (
            <li key={action.id} className="px-4 py-3 flex gap-3">
              {pending ? (
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-[#0070cc]"
                  checked={selected.has(action.id)}
                  onChange={() => toggle(action.id)}
                  disabled={busy}
                  aria-label={`Include: ${action.preview.title}`}
                />
              ) : (
                <span className="mt-0.5"><ResultIcon status={result?.status} /></span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[12px] text-[color:var(--color-text-muted)]">
                  <kind.Icon className="h-3.5 w-3.5" />
                  {kind.label}
                </div>
                <p className="text-[14px] font-medium break-words">{action.preview.title}</p>
                <ActionPreview preview={action.preview} />
                {result && (
                  <p className="mt-1.5 text-[12px]" style={{ color: result.status === 'failed' ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                    {result.status === 'succeeded' ? `${result.message} · verified in database` : result.message}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {pending && (
        <div className="px-4 py-3 border-t flex flex-wrap items-center justify-end gap-2 surface-subtle" style={{ borderColor: 'var(--color-divider)' }}>
          {hasDestructive && (
            <span className="mr-auto flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--color-urgent)' }}>
              <AlertTriangle className="h-3.5 w-3.5" /> Includes a permanent deletion
            </span>
          )}
          <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }} onClick={onReject} disabled={busy}>
            Cancel
          </button>
          <button
            className={hasDestructive ? 'btn-danger' : 'btn-primary'}
            style={{ padding: '7px 14px', fontSize: 13 }}
            onClick={() => onApprove([...selected])}
            disabled={busy || selected.size === 0}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approve {selected.size === proposal.actions.length ? 'all' : selected.size}
          </button>
        </div>
      )}
    </div>
  );
}
