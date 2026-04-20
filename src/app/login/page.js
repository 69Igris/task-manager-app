'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Eye, EyeOff, ArrowRight, Loader2,
  CheckCircle2, Zap, Users, Sparkles, ListTodo,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[color:var(--color-bg-inset)] relative overflow-hidden">
      {/* Ambient gradient blobs — live on both breakpoints now so the right column has depth */}
      <div
        className="absolute -top-24 right-[-80px] lg:right-[20%] h-72 w-72 lg:h-[420px] lg:w-[420px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(30, 174, 219, 0.25) 0%, rgba(0, 112, 204, 0.08) 50%, transparent 75%)',
          filter: 'blur(24px)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -left-20 lg:left-[48%] lg:-bottom-48 h-80 w-80 lg:h-[480px] lg:w-[480px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, rgba(0, 112, 204, 0.06) 50%, transparent 75%)',
          filter: 'blur(28px)',
        }}
        aria-hidden="true"
      />

      {/* Left: dark brand panel (desktop only) */}
      <BrandPanel />

      {/* Right: form */}
      <div className="relative flex items-start lg:items-center justify-center px-5 pt-6 pb-10 lg:px-12 lg:py-12">
        <div className="w-full max-w-md">
          {/* Hero band — visible on all breakpoints */}
          <div className="mobile-hero p-5 lg:p-6 mb-5 lg:mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.18)' }}>
                <div className="h-2 w-2 rounded-sm bg-white" />
              </div>
              <span className="text-sm font-medium tracking-tight text-white">Task Manager</span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.78)' }}>
              <Sparkles className="h-3 w-3" />
              Welcome back
            </div>
            <h1 className="text-[22px] lg:text-[26px] leading-tight font-light text-white">
              Let&apos;s get you <span className="font-medium">back in</span>.
            </h1>
            <p className="mt-1.5 text-[13px] lg:text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.86)' }}>
              Pick up right where you left off.
            </p>
          </div>

          {/* Form card — same visual treatment on mobile & desktop */}
          <div className="card p-6 lg:p-7">
            <div className="mb-5">
              <h2 className="text-[20px] font-medium text-[color:var(--color-text-strong)]">Sign in</h2>
              <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
                Use your email and password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div
                  className="text-sm px-3 py-2.5 flex items-start gap-2"
                  style={{
                    borderRadius: 'var(--radius-input)',
                    color: 'var(--color-danger)',
                    background: 'rgba(200, 27, 58, 0.06)',
                    border: '1px solid rgba(200, 27, 58, 0.25)',
                  }}
                  role="alert"
                >
                  <span className="inline-block mt-0.5 h-1.5 w-1.5 rounded-full bg-[color:var(--color-danger)] shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="floating-field">
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base"
                  placeholder=" "
                />
                <label htmlFor="email">Work email</label>
              </div>

              <div className="floating-field">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base"
                  style={{ paddingRight: 44 }}
                  placeholder=" "
                />
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] flex items-center"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2"
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #0070cc 0%, #1883fd 60%, #0070cc 100%)',
                  boxShadow: '0 6px 18px rgba(0, 112, 204, 0.32)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-sm text-center text-[color:var(--color-text-muted)]">
              New here?{' '}
              <Link href="/register" className="link" style={{ fontWeight: 500 }}>
                Create an account
              </Link>
            </p>

            <div
              className="mt-6 pt-5 border-t text-xs text-[color:var(--color-text-muted)] leading-relaxed"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="font-medium text-[color:var(--color-text)] mb-1 inline-flex items-center gap-1.5">
                <Zap className="h-3 w-3" style={{ color: 'var(--color-accent)' }} />
                Demo credentials
              </p>
              <p>sarah@company.com · Test123!</p>
            </div>
          </div>

          {/* Feature chips — visible on all breakpoints, reinforce what you get */}
          <div className="mt-5 lg:mt-6 grid grid-cols-3 gap-2">
            <FeatureChip Icon={ListTodo} label="Track work" />
            <FeatureChip Icon={Users} label="Share tasks" />
            <FeatureChip Icon={CheckCircle2} label="Stay synced" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div
      className="hidden lg:flex flex-col justify-between items-center p-12 text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #121314 0%, #000000 100%)' }}
    >
      {/* Ambient glow blobs */}
      <div
        className="absolute -top-20 -right-20 h-80 w-80 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0, 112, 204, 0.35) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative self-start flex items-center gap-2">
        <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
          <div className="h-2 w-2 rounded-sm bg-white" />
        </div>
        <span className="text-sm font-medium tracking-tight">Task Manager</span>
      </div>

      <div className="relative max-w-md text-center">
        <p className="text-sm font-medium text-white/60 mb-4">Built for teams that ship</p>
        <h1 style={{ fontWeight: 300, fontSize: '2.75rem', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
          Assign work. Track progress. Stay in sync.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          Equipment-focused task management with nested comments, a shared calendar,
          push notifications, and CSV exports for the completed work log.
        </p>

        {/* Feature rows */}
        <ul className="mt-8 space-y-3.5 text-left inline-block">
          <DesktopFeature Icon={ListTodo} title="Equipment-first tasks" body="Every task ties back to the gear it touches." />
          <DesktopFeature Icon={Users} title="Team visibility" body="Nothing gets lost between people or shifts." />
          <DesktopFeature Icon={CheckCircle2} title="Audit-ready logs" body="One-click CSV export of completed work." />
        </ul>
      </div>

      <div className="relative self-start text-xs text-white/40">© {new Date().getFullYear()} Task Manager</div>
    </div>
  );
}

function DesktopFeature({ Icon, title, body }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Icon className="h-4 w-4 text-white/80" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-xs text-white/60 leading-relaxed mt-0.5">{body}</div>
      </div>
    </li>
  );
}

function FeatureChip({ Icon, label }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 text-center"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Icon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
      <span className="text-[11px] font-medium text-[color:var(--color-text)]">{label}</span>
    </div>
  );
}
