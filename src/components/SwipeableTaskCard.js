'use client';

import { useState, useRef } from 'react';
import {
  Check, Calendar, MapPin, Settings2, User as UserIcon,
  Trash2, CheckCircle2,
} from 'lucide-react';

const SWIPE_THRESHOLD = 80;   // px required to trigger
const MAX_SWIPE = 120;         // px the card drifts visually

function statusLabel(s) { return s === 'in-progress' ? 'In progress' : s.charAt(0).toUpperCase() + s.slice(1); }

function statusTag(s) {
  if (s === 'completed')   return 'tag tag-success';
  if (s === 'in-progress') return 'tag tag-accent';
  return 'tag';
}

function formatDue(dueDate) {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dueDate); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  const label = new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { label, overdue: diff < 0, today: diff === 0 };
}

export default function SwipeableTaskCard({
  task,
  onOpen,          // () => open details
  onComplete,      // () => toggle completed
  onDelete,        // () => delete task
  canDelete = false,
  canComplete = true,
}) {
  const [translateX, setTranslateX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startX = useRef(null);
  const startY = useRef(null);
  const currentX = useRef(0);
  const isSwiping = useRef(false);

  const due = formatDue(task.dueDate);
  const urgent = due?.overdue && task.status !== 'completed';
  const completed = task.status === 'completed';

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = 0;
    isSwiping.current = false;
    setAnimating(false);
  };

  const onTouchMove = (e) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Decide once whether this gesture is a horizontal swipe
    if (!isSwiping.current) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        isSwiping.current = true;
      } else if (Math.abs(dy) > Math.abs(dx)) {
        // vertical scroll — bail
        startX.current = null;
        return;
      }
    }
    if (!isSwiping.current) return;

    // Respect available actions. Without permission, rubber-band resistance.
    let effective = dx;
    if (dx > 0 && !canComplete) effective = dx * 0.25;
    if (dx < 0 && !canDelete)   effective = dx * 0.25;

    // Clamp
    if (effective > MAX_SWIPE)  effective = MAX_SWIPE;
    if (effective < -MAX_SWIPE) effective = -MAX_SWIPE;

    currentX.current = effective;
    setTranslateX(effective);
  };

  const onTouchEnd = () => {
    if (startX.current === null) return;
    const dx = currentX.current;
    setAnimating(true);
    startX.current = null;

    if (dx >= SWIPE_THRESHOLD && canComplete) {
      setTranslateX(MAX_SWIPE);
      setTimeout(() => {
        setTranslateX(0);
        onComplete && onComplete();
      }, 160);
    } else if (dx <= -SWIPE_THRESHOLD && canDelete) {
      setTranslateX(-MAX_SWIPE);
      setTimeout(() => {
        setTranslateX(0);
        onDelete && onDelete();
      }, 160);
    } else {
      setTranslateX(0);
    }
  };

  const onClickCard = (e) => {
    // If the swipe moved more than ~6px, swallow click
    if (Math.abs(currentX.current) > 6) {
      currentX.current = 0;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onOpen && onOpen();
  };

  const showingComplete = translateX > 20;
  const showingDelete = translateX < -20;

  return (
    <div className="swipe-wrap">
      {/* Reveal background — colored when swiping */}
      <div
        className={`absolute inset-0 transition-colors ${
          showingComplete ? 'swipe-bg-complete' : showingDelete ? 'swipe-bg-delete' : ''
        }`}
        style={{
          background: showingComplete
            ? 'linear-gradient(90deg, #0a7d3a 0%, #1ca352 100%)'
            : showingDelete
              ? 'linear-gradient(90deg, #ff6b1a 0%, #d53b00 100%)'
              : 'var(--color-bg-subtle)',
        }}
      />
      <div className="swipe-actions">
        <span className="swipe-action-left" style={{ opacity: showingComplete ? 1 : 0 }}>
          <CheckCircle2 className="h-4 w-4" />
          {completed ? 'Reopen' : 'Complete'}
        </span>
        <span className="swipe-action-right" style={{ opacity: showingDelete ? 1 : 0 }}>
          Delete
          <Trash2 className="h-4 w-4" />
        </span>
      </div>

      {/* Surface */}
      <div
        className="swipe-surface"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: animating ? 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <article
          className="mobile-card p-4"
          data-priority={task.priority || ''}
          data-completed={completed ? 'true' : 'false'}
          onClick={onClickCard}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-start gap-3 pl-2">
            {/* Round animated checkbox */}
            <button
              type="button"
              className="round-check mt-0.5"
              data-priority={task.priority || ''}
              data-checked={completed ? 'true' : 'false'}
              onClick={(e) => {
                e.stopPropagation();
                if (canComplete && onComplete) onComplete();
              }}
              aria-label={completed ? 'Reopen task' : 'Mark complete'}
              disabled={!canComplete}
              style={!canComplete ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>

            {/* Body */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] mb-1" style={{ color: 'var(--color-text-muted)' }}>
                <Settings2 className="h-3 w-3 shrink-0" />
                <span className="truncate font-medium">{task.equipment || 'Unassigned'}</span>
                {task.area && (
                  <>
                    <span style={{ color: 'var(--color-text-subtle)' }}>·</span>
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{task.area}</span>
                  </>
                )}
              </div>

              <h3
                className="strike-line text-[15px] leading-snug font-medium"
                data-completed={completed ? 'true' : 'false'}
                style={{ color: completed ? 'var(--color-text-muted)' : 'var(--color-text-strong)' }}
              >
                {task.title}
              </h3>

              {task.description && (
                <p className="mt-1 text-[13px] leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                  {task.description}
                </p>
              )}

              {task.assignedUsers?.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <UserIcon className="h-3 w-3" style={{ color: 'var(--color-text-subtle)' }} />
                  {task.assignedUsers.map((u) => (
                    <span key={u.id} className="tag" style={{ fontSize: 10, padding: '1px 7px' }}>
                      {u.name.split(' ')[0]}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                <span className={statusTag(task.status)} style={{ fontSize: 10, padding: '1px 8px' }}>
                  {statusLabel(task.status)}
                </span>
                {due && (
                  <span
                    className={
                      urgent ? 'tag tag-urgent'
                      : due.today && !completed ? 'tag tag-warn'
                      : 'tag'
                    }
                    style={{ fontSize: 10, padding: '1px 8px' }}
                  >
                    <Calendar className="h-2.5 w-2.5" />
                    {urgent ? `Overdue · ${due.label}` : due.today ? 'Today' : due.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
