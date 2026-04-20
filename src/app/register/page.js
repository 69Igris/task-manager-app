'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye, EyeOff, ArrowRight, Loader2,
  CheckCircle2, Users, Sparkles, ListTodo, Bell,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function passwordScore(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw))   score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}
const STRENGTH_LABEL = ['Too short', 'Weak', 'Okay', 'Strong', 'Excellent'];
const STRENGTH_COLOR = [
  'var(--color-text-subtle)',
  'var(--color-urgent)',
  '#d4a017',
  'var(--color-accent)',
  '#0a7d3a',
];

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const score = passwordScore(password);
  const matches = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (password.length < 8) return setError('Password must be at least 8 characters');

    setLoading(true);
    const result = await register(name, email, password);
    if (result.success) router.push('/dashboard');
    else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[color:var(--color-bg-inset)] relative overflow-hidden">
      {/* Ambient gradient blobs — visible on both breakpoints for depth */}
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

      <BrandPanel />

      <div className="relative flex items-start lg:items-center justify-center px-5 pt-6 pb-10 lg:px-12 lg:py-12">
        <div className="w-full max-w-md">
          {/* Hero band — visible on all breakpoints */}
          <div className="mobile-hero p-5 lg:p-6 mb-5 lg:mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="h-8 w-8 rounded-md flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              >
                <div className="h-2 w-2 rounded-sm bg-white" />
              </div>
              <span className="text-sm font-medium tracking-tight text-white">Task Manager</span>
            </div>
            <div
              className="inline-flex items-center gap-1.5 text-[11px] font-medium mb-1"
              style={{ color: 'rgba(255,255,255,0.78)' }}
            >
              <Sparkles className="h-3 w-3" />
              New account
            </div>
            <h1 className="text-[22px] lg:text-[26px] leading-tight font-light text-white">
              Start fresh, <span className="font-medium">together</span>.
            </h1>
            <p className="mt-1.5 text-[13px] lg:text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.86)' }}>
              Less than a minute to set up. Free for your team.
            </p>
          </div>

          {/* Form card — consistent on both breakpoints */}
          <div className="card p-6 lg:p-7">
            <div className="mb-5">
              <h2 className="text-[20px] font-medium text-[color:var(--color-text-strong)]">Create account</h2>
              <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
                Fill in these details and you&apos;re in.
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
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-base"
                  placeholder=" "
                />
                <label htmlFor="name">Full name</label>
              </div>

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

              <div>
                <div className="floating-field">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-base"
                    style={{ paddingRight: 44 }}
                    placeholder=" "
                  />
                  <label htmlFor="password">Password (min. 8 characters)</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 px-3 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] flex items-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password strength meter — shows only when the user has typed something */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="h-1 flex-1 rounded-full transition-colors"
                          style={{
                            background:
                              i < score ? STRENGTH_COLOR[score] : 'var(--color-divider)',
                          }}
                        />
                      ))}
                    </div>
                    <p
                      className="text-[11px] mt-1.5 font-medium"
                      style={{ color: STRENGTH_COLOR[score] }}
                    >
                      {STRENGTH_LABEL[score]}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="floating-field">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-base"
                    style={{ paddingRight: 44 }}
                    placeholder=" "
                  />
                  <label htmlFor="confirmPassword">Confirm password</label>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 px-3 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] flex items-center"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p
                    className="text-[11px] mt-1.5 font-medium inline-flex items-center gap-1"
                    style={{ color: matches ? '#0a7d3a' : 'var(--color-urgent)' }}
                  >
                    {matches ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Passwords match
                      </>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        Passwords don&apos;t match yet
                      </>
                    )}
                  </p>
                )}
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
                    <span>Creating account</span>
                  </>
                ) : (
                  <>
                    <span>Create account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-center leading-relaxed" style={{ color: 'var(--color-text-subtle)' }}>
                By creating an account you agree to use Task Manager responsibly. No spam. You can delete anytime.
              </p>
            </form>

            <p className="mt-5 text-sm text-center text-[color:var(--color-text-muted)]">
              Already have an account?{' '}
              <Link href="/login" className="link" style={{ fontWeight: 500 }}>
                Sign in
              </Link>
            </p>
          </div>

          {/* Feature chips — visible on all breakpoints */}
          <div className="mt-5 lg:mt-6 grid grid-cols-3 gap-2">
            <FeatureChip Icon={ListTodo} label="Track work" />
            <FeatureChip Icon={Bell} label="Stay alerted" />
            <FeatureChip Icon={Users} label="Share tasks" />
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
        <p className="text-sm font-medium text-white/60 mb-4">Create your account</p>
        <h1 style={{ fontWeight: 300, fontSize: '2.75rem', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
          One workspace. Every task your team owns.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          You&apos;ll be able to create tasks, assign them to teammates, track progress,
          and export completed work — all from a single calm workspace.
        </p>

        <ul className="mt-8 space-y-3.5 text-left inline-block">
          <DesktopFeature Icon={ListTodo} title="Everything in one place" body="Tasks, comments, events — unified." />
          <DesktopFeature Icon={Bell}      title="Gentle reminders"     body="Push alerts before work slips." />
          <DesktopFeature Icon={CheckCircle2} title="Easy exports"      body="CSV downloads for the audit log." />
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
