'use client';

import { Database } from 'lucide-react';

/**
 * Numbers computed by TaskForge from the database, shown apart from the
 * model's prose so users can tell facts from AI recommendations.
 */

function Stat({ label, value, tone }) {
  const color = tone === 'urgent' ? 'var(--color-urgent)' : tone === 'good' ? '#0a7d3a' : 'var(--color-text-strong)';
  return (
    <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-[18px] font-medium tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[11px] text-[color:var(--color-text-muted)]">{label}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[12px] font-medium mb-2">{title}</p>
      {children}
    </div>
  );
}

export default function FactsPanel({ artifacts }) {
  const summary = artifacts?.get_sprint_summary;
  const priorities = artifacts?.get_priority_recommendations;
  const briefing = artifacts?.get_daily_briefing;
  if (!summary && !priorities && !briefing) return null;

  return (
    <div className="mt-3 rounded-xl border p-3 space-y-4 surface-inset" style={{ borderColor: 'var(--color-border)' }}>
      <p className="flex items-center gap-1.5 text-[11px] text-[color:var(--color-text-muted)]">
        <Database className="h-3.5 w-3.5" /> From the database · computed by TaskForge, not the AI
      </p>

      {summary && (
        <Section title={`Progress · ${summary.project}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Completion rate" value={`${summary.completionRatePercent}%`} tone="good" />
            <Stat label="Open tasks" value={summary.openTasks} />
            <Stat label="Overdue" value={summary.overdue.length} tone={summary.overdue.length ? 'urgent' : undefined} />
            <Stat label={`Due by ${summary.upcomingDeadlines.until}`} value={summary.upcomingDeadlines.tasks.length} />
          </div>
          <p className="mt-2 text-[12px] text-[color:var(--color-text-muted)]">
            {summary.byStatus.pending} pending · {summary.byStatus['in-progress']} in progress · {summary.byStatus.completed} completed
            {summary.potentialBlockers.length > 0 && ` · ${summary.potentialBlockers.length} potential blocker(s)`}
          </p>
        </Section>
      )}

      {priorities && priorities.ranked.length > 0 && (
        <Section title="Priority ranking">
          <ol className="space-y-1.5">
            {priorities.ranked.map((t, i) => (
              <li key={t.id} className="flex items-start gap-2 text-[13px]">
                <span className="w-5 shrink-0 tabular-nums text-[color:var(--color-text-muted)]">{i + 1}.</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{t.title}</span>
                  <span className="block text-[11.5px] text-[color:var(--color-text-muted)]">{t.reasons.join(' · ')}</span>
                </span>
                <span className="tag tabular-nums">{t.score}</span>
              </li>
            ))}
          </ol>
          {priorities.workload.some((w) => w.overloaded || w.sameDayHighPriorityConflicts.length) && (
            <ul className="mt-2 space-y-0.5 text-[12px]" style={{ color: '#a86400' }}>
              {priorities.workload.filter((w) => w.overloaded).map((w) => (
                <li key={`o-${w.member}`}>{w.member} has {w.openTasks} open tasks (over {priorities.overloadThreshold})</li>
              ))}
              {priorities.workload.flatMap((w) => w.sameDayHighPriorityConflicts.map((c) => (
                <li key={`c-${w.member}-${c.date}`}>{w.member} has {c.taskIds.length} high-priority tasks due {c.date}</li>
              )))}
            </ul>
          )}
        </Section>
      )}

      {briefing && (
        <Section title={`Briefing · ${briefing.today}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Completed (24h)" value={briefing.facts.completedLast24h.length} tone="good" />
            <Stat label="Overdue" value={briefing.facts.overdue.length} tone={briefing.facts.overdue.length ? 'urgent' : undefined} />
            <Stat label="Due soon" value={briefing.facts.dueSoon.length} />
            <Stat label="New comments" value={briefing.facts.newCommentsFromOthers.length} />
          </div>
        </Section>
      )}
    </div>
  );
}
