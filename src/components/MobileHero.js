'use client';

import Link from 'next/link';
import { AlertTriangle, Sparkles } from 'lucide-react';

/**
 * Generic mobile hero used across every dashboard tab.
 *
 * Props:
 *  - eyebrow: string — small top label (defaults to today's date)
 *  - eyebrowIcon: Component — small top icon (defaults to Sparkles)
 *  - title: string — main bold line (e.g. "Good afternoon")
 *  - accent: string — optional accented end of the title (e.g. user name)
 *  - body: string — supporting sentence under the title
 *  - progress: number | null — 0-100 for the ring; pass null to hide ring
 *  - progressLabel: string — text shown under the number (default "PERCENT")
 *  - progressIcon: Component — icon shown inside ring when progress === 100 or when progress is null but icon provided
 *  - tiles: Array<{ tone, label, value, Icon, emphasise, href }> — up to 4 StatTiles (rendered 2x2). When `href` is present the tile becomes a Link.
 *  - alert: { tone?: 'danger' | 'warn', icon?: Component, message: ReactNode } — optional bottom banner
 */
export default function MobileHero({
  eyebrow,
  eyebrowIcon: EyebrowIcon = Sparkles,
  title,
  accent,
  body,
  progress = null,
  progressLabel = 'PERCENT',
  progressIcon: ProgressIcon = null,
  tiles = [],
  alert = null,
}) {
  const today = new Date();
  const defaultEyebrow = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const hasNumericProgress = typeof progress === 'number' && !Number.isNaN(progress);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const pct = hasNumericProgress ? Math.max(0, Math.min(100, progress)) : 0;
  const offset = circumference - (pct / 100) * circumference;

  const showRing = hasNumericProgress || Boolean(ProgressIcon);
  const showRingIcon =
    (!hasNumericProgress && ProgressIcon) ||
    (hasNumericProgress && pct >= 100 && ProgressIcon);

  // alert defaults
  const alertTone = alert?.tone || 'danger';
  const AlertIcon = alert?.icon || AlertTriangle;
  const alertBg =
    alertTone === 'warn'
      ? { bg: 'rgba(233, 115, 0, 0.08)', border: 'rgba(233, 115, 0, 0.28)', fg: 'var(--color-warning)' }
      : { bg: 'rgba(213, 59, 0, 0.08)', border: 'rgba(213, 59, 0, 0.28)', fg: 'var(--color-urgent)' };

  return (
    <div className="px-4 pt-4 pb-2 lg:px-0 lg:pt-0 lg:pb-0 space-y-4 lg:space-y-5">
      {/* Greeting / heading + optional progress */}
      <div className="mobile-hero p-5 lg:p-7">
        <div className="flex items-center justify-between gap-4 lg:gap-6">
          <div className="min-w-0 flex-1">
            <div
              className="inline-flex items-center gap-1.5 text-[11px] lg:text-[12px] font-medium mb-1"
              style={{ color: 'rgba(255,255,255,0.78)' }}
            >
              <EyebrowIcon className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
              {eyebrow || defaultEyebrow}
            </div>
            <h1
              className="text-[22px] lg:text-[30px] leading-tight font-light"
              style={{ color: '#ffffff', letterSpacing: '-0.01em' }}
            >
              {title}
              {accent ? (
                <>
                  , <span className="font-medium">{accent}</span>
                </>
              ) : null}
              .
            </h1>
            {body && (
              <p
                className="mt-1.5 lg:mt-2 text-[13px] lg:text-[14px] leading-relaxed max-w-xl"
                style={{ color: 'rgba(255,255,255,0.86)' }}
              >
                {body}
              </p>
            )}
          </div>

          {showRing && (
            <div className="relative h-20 w-20 lg:h-24 lg:w-24 shrink-0">
              <svg className="progress-ring h-full w-full" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r={radius} strokeWidth="5" stroke="rgba(255,255,255,0.22)" />
                {hasNumericProgress && (
                  <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    strokeWidth="5"
                    stroke="#ffffff"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {showRingIcon ? (
                  <ProgressIcon
                    className={`h-7 w-7 lg:h-8 lg:w-8 ${hasNumericProgress && pct >= 100 ? 'animate-celebrate' : ''}`}
                    style={{ color: '#ffffff' }}
                  />
                ) : hasNumericProgress ? (
                  <div className="text-center leading-none">
                    <div className="text-[20px] lg:text-[24px] font-light" style={{ color: '#ffffff' }}>
                      {pct}
                    </div>
                    <div
                      className="text-[9px] lg:text-[10px] font-medium mt-0.5 tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.78)' }}
                    >
                      {progressLabel}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stat tiles — 2×2 on mobile, 4-up row on desktop */}
      {tiles.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {tiles.slice(0, 4).map((t, i) => (
            <StatTile key={i} {...t} />
          ))}
        </div>
      )}

      {alert && alert.message && (
        <div
          className="flex items-start gap-2.5 px-3.5 py-2.5 lg:px-4 lg:py-3"
          style={{
            background: alertBg.bg,
            border: `1px solid ${alertBg.border}`,
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <AlertIcon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: alertBg.fg }} />
          <p className="text-xs lg:text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
            {alert.message}
          </p>
        </div>
      )}
    </div>
  );
}

function StatTile({ tone, label, value, Icon, emphasise, href }) {
  const inner = (
    <>
      {Icon && <Icon className="stat-icon h-6 w-6" />}
      <div className={`stat-value ${emphasise ? 'animate-celebrate' : ''}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={`stat-tile ${tone} stat-tile-link`} aria-label={`${label}: ${value}`}>
        {inner}
      </Link>
    );
  }
  return <div className={`stat-tile ${tone}`}>{inner}</div>;
}
