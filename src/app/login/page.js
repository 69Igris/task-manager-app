'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
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
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left: dark brand panel (Console Black) */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-white" style={{ background: 'linear-gradient(180deg, #121314 0%, #000000 100%)' }}>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
            <div className="h-2 w-2 rounded-sm bg-white" />
          </div>
          <span className="text-sm font-medium tracking-tight">Task Manager</span>
        </div>

        <div className="max-w-md">
          <p className="text-sm font-medium text-white/60 mb-4">Built for teams that ship</p>
          <h1 style={{ fontWeight: 300, fontSize: '2.75rem', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
            Assign work. Track progress. Stay in sync.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Equipment-focused task management with nested comments, a shared calendar,
            push notifications, and CSV exports for the completed work log.
          </p>
        </div>

        <div className="text-xs text-white/40">© {new Date().getFullYear()} Task Manager</div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="display-sm" style={{ fontWeight: 500 }}>Sign in</h2>
            <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
              Welcome back. Enter your credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div
                className="text-sm px-3 py-2.5 rounded"
                style={{
                  borderRadius: 'var(--radius-input)',
                  color: 'var(--color-danger)',
                  background: 'rgba(200, 27, 58, 0.06)',
                  border: '1px solid rgba(200, 27, 58, 0.25)',
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-medium mb-1.5 text-[color:var(--color-text)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-[color:var(--color-text)]">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base"
                  style={{ paddingRight: '40px' }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full" style={{ padding: '12px 20px' }}>
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

          <p className="mt-6 text-sm text-center text-[color:var(--color-text-muted)]">
            New here?{' '}
            <Link href="/register" className="link" style={{ fontWeight: 500 }}>
              Create an account
            </Link>
          </p>

          <div className="mt-10 pt-6 border-t text-xs text-[color:var(--color-text-muted)] leading-relaxed" style={{ borderColor: 'var(--color-border)' }}>
            <p className="font-medium text-[color:var(--color-text)] mb-1">Demo credentials</p>
            <p>maninder@company.com · Test123!</p>
            <p>sarah@company.com · Test123!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
