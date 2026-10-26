'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, CalendarClock, CheckCircle2, ChevronDown, Loader2, MessageSquare, Plus,
  RotateCcw, Send, Sparkles, Target, Trash2, Wrench, XCircle, ListChecks, Bell, X, Maximize2,
} from 'lucide-react';
import MessageContent from '@/components/assistant/MessageContent';
import ProposalCard from '@/components/assistant/ProposalCard';
import FactsPanel from '@/components/assistant/FactsPanel';

const QUICK_ACTIONS = [
  { Icon: CalendarClock, label: 'Daily briefing', prompt: 'Give me my daily project briefing.' },
  { Icon: ListChecks, label: 'Sprint summary', prompt: 'Summarize our sprint progress and identify the biggest blockers.' },
  { Icon: Target, label: 'Prioritize today', prompt: 'Which tasks are overdue, and what should the team prioritize today?' },
  { Icon: Sparkles, label: 'Plan a sprint', prompt: 'Help me plan the next sprint: review open work, recommend priorities, and draft any missing tasks for my approval.' },
  { Icon: Bell, label: 'Deadline reminders', prompt: 'Which tasks are due in the next few days? Offer to remind the assignees.' },
];

const TOOL_LABELS = {
  list_projects: 'Listed projects',
  list_team_members: 'Looked up team members',
  list_tasks: 'Read tasks',
  get_task_details: 'Read task details',
  get_sprint_summary: 'Computed sprint summary',
  get_priority_recommendations: 'Ranked priorities',
  get_daily_briefing: 'Gathered briefing facts',
  create_tasks: 'Drafted new tasks',
  update_task: 'Drafted a task update',
  update_task_status: 'Drafted a status change',
  add_task_comment: 'Drafted a comment',
  delete_task: 'Drafted a deletion',
  create_deadline_reminders: 'Drafted reminders',
};

const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

function Steps({ steps }) {
  const [open, setOpen] = useState(false);
  if (!steps?.length) return null;
  const failed = steps.filter((s) => s.status === 'error' || s.status === 'failed').length;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
      >
        <Wrench className="h-3.5 w-3.5" />
        {steps.length} tool call{steps.length === 1 ? '' : 's'}{failed ? ` · ${failed} failed` : ''}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ol className="mt-1.5 space-y-1 border-l pl-3 text-[12px]" style={{ borderColor: 'var(--color-border)' }}>
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-1.5">
              {s.status === 'error' || s.status === 'failed'
                ? <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--color-danger)' }} />
                : <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: s.status === 'proposed' ? 'var(--color-accent)' : '#0a7d3a' }} />}
              <span className="min-w-0">
                <span className="font-medium">{TOOL_LABELS[s.tool] || s.tool}</span>
                {s.args && <span className="text-[color:var(--color-text-subtle)]"> ({s.args})</span>}
                {s.summary && <span className="text-[color:var(--color-text-muted)]"> — {s.summary}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ExecutedActions({ actions }) {
  if (!actions?.length) return null;
  return (
    <ul className="mt-3 space-y-1">
      {actions.map((a, i) => (
        <li key={i} className="flex items-center gap-1.5 text-[12.5px]">
          {a.result.status === 'succeeded'
            ? <CheckCircle2 className="h-4 w-4" style={{ color: '#0a7d3a' }} />
            : <XCircle className="h-4 w-4" style={{ color: 'var(--color-danger)' }} />}
          {a.result.message}
          {a.result.status === 'succeeded' && <span className="text-[color:var(--color-text-subtle)]">· ran automatically</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * The assistant chat. `variant="page"` fills the /dashboard/assistant route;
 * `variant="popup"` is the compact desktop chat window opened from the
 * floating button (see the dashboard layout).
 */
export default function AssistantChat({ variant = 'page', onClose }) {
  const popup = variant === 'popup';
  const { fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const [status, setStatus] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [proposals, setProposals] = useState({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [busyProposal, setBusyProposal] = useState(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const scrollerRef = useRef(null);
  const inputRef = useRef(null);

  const api = useCallback(async (url, options) => {
    const res = await fetchWithAuth(url, options);
    let data = null;
    try { data = await res.json(); } catch { /* empty body */ }
    return { ok: res.ok, status: res.status, data };
  }, [fetchWithAuth]);

  const loadConversations = useCallback(async () => {
    const { ok, data } = await api('/api/ai/conversations');
    if (ok) setConversations(data.conversations || []);
  }, [api]);

  useEffect(() => {
    api('/api/ai/status').then(({ ok, data }) => ok && setStatus(data));
    api('/api/ai/conversations').then(({ ok, data }) => ok && setConversations(data.conversations || []));
  }, [api]);

  useEffect(() => {
    const el = scrollerRef.current;
    // Leave the empty state at the top; follow the conversation once it starts.
    if (el && (messages.length || sending)) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const openConversation = async (id) => {
    if (sending) return;
    setLoadingConversation(true);
    const { ok, data } = await api(`/api/ai/conversations/${id}`);
    setLoadingConversation(false);
    if (!ok) return showToast(data?.error?.message || 'Could not load conversation', 'error');
    setConversationId(id);
    setMessages(data.conversation.messages.map((m) => ({ ...m, key: newId() })));
    setProposals(Object.fromEntries(data.proposals.map((p) => [p.id, p])));
  };

  const newConversation = () => {
    if (sending) return;
    setConversationId(null);
    setMessages([]);
    setProposals({});
    inputRef.current?.focus();
  };

  const deleteConversation = async (id) => {
    const { ok, data } = await api(`/api/ai/conversations/${id}`, { method: 'DELETE' });
    if (!ok) return showToast(data?.error?.message || 'Could not delete conversation', 'error');
    if (id === conversationId) newConversation();
    loadConversations();
  };

  const send = async (text, clientMessageId = newId(), isRetry = false) => {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    if (!isRetry) {
      setMessages((prev) => [...prev, { key: newId(), role: 'user', content: message }]);
      setInput('');
    } else {
      setMessages((prev) => prev.filter((m) => !m.error));
    }

    const { ok, data, status: httpStatus } = await api('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId, clientMessageId }),
    });
    setSending(false);

    if (!ok) {
      const err = data?.error || {};
      setMessages((prev) => [...prev, {
        key: newId(),
        role: 'assistant',
        error: true,
        content: err.message || `Request failed (${httpStatus}).`,
        retry: httpStatus >= 500 || httpStatus === 429 || httpStatus === 409 ? { message, clientMessageId } : null,
        executedActions: err.executedActions,
      }]);
      return;
    }

    setConversationId(data.conversationId);
    if (data.proposal) setProposals((prev) => ({ ...prev, [data.proposal.id]: data.proposal }));
    setMessages((prev) => [...prev, {
      key: newId(),
      role: 'assistant',
      content: data.message.content,
      proposalId: data.message.proposalId,
      steps: data.steps,
      artifacts: data.artifacts,
      executedActions: data.executedActions,
      stopReason: data.stopReason,
    }]);
    if (data.executedActions?.some((a) => a.result.status === 'succeeded')) {
      window.dispatchEvent(new Event('refreshTasks'));
      window.dispatchEvent(new Event('refreshNotifications'));
    }
    loadConversations();
  };

  const decide = async (proposalId, approve, actionIds) => {
    setBusyProposal(proposalId);
    const { ok, data } = await api(`/api/ai/proposals/${proposalId}/${approve ? 'approve' : 'reject'}`, {
      method: 'POST',
      body: JSON.stringify(approve ? { actionIds } : {}),
    });
    setBusyProposal(null);
    if (data?.proposal) setProposals((prev) => ({ ...prev, [proposalId]: data.proposal }));
    if (!ok) return showToast(data?.error?.message || 'Could not update the proposal', 'error');

    const p = data.proposal;
    if (approve) {
      const results = (p.results || []).filter((r) => r.status !== 'skipped');
      const okCount = results.filter((r) => r.status === 'succeeded').length;
      showToast(
        okCount === results.length ? `${okCount} change(s) saved` : `${okCount} of ${results.length} change(s) saved`,
        okCount === results.length ? 'success' : 'warning'
      );
      window.dispatchEvent(new Event('refreshTasks'));
      window.dispatchEvent(new Event('refreshNotifications'));
    } else {
      showToast('Proposal cancelled — nothing was changed', 'info');
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const notConfigured = status && !status.configured;

  return (
    // Page: fixed height (viewport minus header and the layout's bottom padding)
    // so the message list scrolls internally and the composer stays in view.
    // Popup: fills the window the layout gives it.
    <div className={popup ? 'flex h-full' : 'flex h-[calc(100dvh-56px-96px)] lg:h-[calc(100dvh-56px-40px)]'}>
      {/* Conversation list (wide screens, page only) */}
      {!popup && (
      <aside className="hidden xl:flex w-64 shrink-0 flex-col border-r bg-white" style={{ borderColor: 'var(--color-border)' }}>
        <div className="p-3">
          <button onClick={newConversation} className="btn-secondary w-full" style={{ padding: '8px 12px', fontSize: 13 }}>
            <Plus className="h-4 w-4" /> New chat
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {conversations.map((c) => (
            <li key={c.id} className="group flex items-center">
              <button
                onClick={() => openConversation(c.id)}
                className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-[13px] transition-colors"
                style={{
                  background: c.id === conversationId ? 'rgba(0, 112, 204, 0.08)' : 'transparent',
                  color: c.id === conversationId ? 'var(--color-accent)' : 'var(--color-text)',
                }}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.title}</span>
              </button>
              <button
                onClick={() => deleteConversation(c.id)}
                className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Delete conversation"
                title="Delete conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {conversations.length === 0 && (
            <li className="px-2.5 py-2 text-[12px] text-[color:var(--color-text-subtle)]">No conversations yet</li>
          )}
        </ul>
      </aside>
      )}

      <section className="flex-1 min-w-0 flex flex-col">
        <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className={popup ? 'w-full px-4 pt-3' : 'w-full max-w-3xl mx-auto px-4 lg:px-6 pt-5'}>
          {/* Conversation picker (popup, and narrow screens on the page) */}
          <div className={`${popup ? 'sticky top-0 z-10 -mx-4 px-4 pb-3 bg-white border-b mb-3' : 'xl:hidden mb-4'} flex items-center gap-2`} style={popup ? { borderColor: 'var(--color-divider)' } : undefined}>
            <select
              className="input-base flex-1"
              style={{ padding: '7px 10px', fontSize: 13 }}
              value={conversationId || ''}
              onChange={(e) => (e.target.value ? openConversation(e.target.value) : newConversation())}
              aria-label="Conversation"
            >
              <option value="">New chat</option>
              {conversations.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <button onClick={newConversation} className="btn-secondary" style={{ padding: '7px 10px' }} aria-label="New chat" title="New chat">
              <Plus className="h-4 w-4" />
            </button>
            {popup && (
              <>
                <Link href="/dashboard/assistant" onClick={onClose} className="btn-ghost" style={{ padding: 8 }} aria-label="Open full page" title="Open full page">
                  <Maximize2 className="h-4 w-4" />
                </Link>
                <button onClick={onClose} className="btn-ghost" style={{ padding: 8 }} aria-label="Close assistant" title="Close">
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {notConfigured && (
            <div className="card p-4 mb-4 flex gap-3" style={{ borderColor: 'rgba(168, 100, 0, 0.35)' }}>
              <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: '#a86400' }} />
              <div className="text-[13px]">
                <p className="font-medium">The assistant isn&apos;t configured yet</p>
                <p className="text-[color:var(--color-text-muted)]">Set <code>{status.requiredKey || 'the provider API key'}</code> on the server to enable it. Your tasks are unaffected.</p>
              </div>
            </div>
          )}

          {loadingConversation && (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-accent)' }} /></div>
          )}

          {!loadingConversation && messages.length === 0 && (
            <div className={popup ? 'py-3' : 'py-8'}>
              <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(0, 112, 204, 0.08)' }}>
                <Sparkles className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
              </div>
              <h2 className="display-sm">Project assistant</h2>
              <p className="mt-1 text-[14px] text-[color:var(--color-text-muted)] max-w-lg">
                Ask about your tasks in plain language. The assistant reads live data you have access to, and every change it suggests waits for your approval.
              </p>
              <div className={popup ? 'mt-4 grid gap-2' : 'mt-6 grid sm:grid-cols-2 gap-2'}>
                {QUICK_ACTIONS.map(({ Icon, label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => send(prompt)}
                    disabled={sending || notConfigured}
                    className="card card-interactive text-left p-3 flex items-start gap-3 disabled:opacity-50"
                  >
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
                    <span>
                      <span className="block text-[13px] font-medium">{label}</span>
                      <span className="block text-[12px] text-[color:var(--color-text-muted)] line-clamp-2">{prompt}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <ul className="space-y-5 pb-6">
            {messages.map((m) => (
              <li key={m.key} className={m.role === 'user' ? 'flex justify-end' : ''}>
                {m.role === 'user' ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-[14px] text-white whitespace-pre-wrap break-words" style={{ background: 'var(--color-accent)' }}>
                    {m.content}
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div
                      className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center"
                      style={{ background: m.error ? 'rgba(200, 27, 58, 0.08)' : 'rgba(0, 112, 204, 0.08)' }}
                    >
                      {m.error
                        ? <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--color-danger)' }} />
                        : <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-accent)' }} />}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      {m.error ? (
                        <div>
                          <p className="text-[14px]" style={{ color: 'var(--color-danger)' }}>{m.content}</p>
                          {m.retry && (
                            <button onClick={() => send(m.retry.message, m.retry.clientMessageId, true)} className="btn-secondary mt-2" style={{ padding: '6px 12px', fontSize: 12 }}>
                              <RotateCcw className="h-3.5 w-3.5" /> Retry
                            </button>
                          )}
                        </div>
                      ) : (
                        <MessageContent content={m.content} />
                      )}
                      <ExecutedActions actions={m.executedActions} />
                      <FactsPanel artifacts={m.artifacts} />
                      {m.proposalId && proposals[m.proposalId] && (
                        <ProposalCard
                          proposal={proposals[m.proposalId]}
                          busy={busyProposal === m.proposalId}
                          onApprove={(ids) => decide(m.proposalId, true, ids)}
                          onReject={() => decide(m.proposalId, false)}
                        />
                      )}
                      <Steps steps={m.steps} />
                    </div>
                  </div>
                )}
              </li>
            ))}
            {sending && (
              <li className="flex gap-3 items-center text-[13px] text-[color:var(--color-text-muted)]">
                <div className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(0, 112, 204, 0.08)' }}>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--color-accent)' }} />
                </div>
                Reading your project data…
              </li>
            )}
          </ul>
        </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t bg-white" style={{ borderColor: 'var(--color-border)' }}>
          <div className={popup ? 'px-3 py-2.5' : 'max-w-3xl mx-auto px-4 lg:px-6 py-3'}>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={notConfigured ? 'Assistant not configured' : popup ? 'Ask about your tasks…' : 'Ask about your project, or describe tasks to create…'}
                disabled={sending || notConfigured}
                maxLength={4000}
                className="input-base flex-1 resize-none"
                style={{ minHeight: 42, maxHeight: 160 }}
              />
              <button
                onClick={() => send(input)}
                disabled={sending || !input.trim() || notConfigured}
                className="btn-primary"
                style={{ padding: '10px 14px' }}
                aria-label="Send"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-[color:var(--color-text-subtle)]">
              {popup
                ? 'Changes wait for your approval. AI suggestions can be wrong.'
                : 'Changes are previewed for your approval. Numbers and dates come from TaskForge; AI suggestions can be wrong.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
