'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div
        className="hidden lg:flex flex-col justify-between p-12 text-white"
        style={{ background: 'linear-gradient(180deg, #121314 0%, #000000 100%)' }}
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
            <div className="h-2 w-2 rounded-sm bg-white" />
          </div>
          <span className="text-sm font-medium tracking-tight">Task Manager</span>
        </div>

        <div className="max-w-md">
          <p className="text-sm font-medium text-white/60 mb-4">Create your account</p>
          <h1 style={{ fontWeight: 300, fontSize: '2.75rem', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
            One workspace. Every task your team owns.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            You'll be able to create tasks, assign them to teammates, track progress,
            and export completed work — all from a single calm workspace.
          </p>
        </div>

        <div className="text-xs text-white/40">© {new Date().getFullYear()} Task Manager</div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="display-sm" style={{ fontWeight: 500 }}>Create account</h2>
            <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
              Takes less than a minute.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div
                className="text-sm px-3 py-2.5"
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
              <label htmlFor="name" className="block text-xs font-medium mb-1.5">Full name</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-base"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium mb-1.5">Email</label>
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
              <label htmlFor="password" className="block text-xs font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base"
                  style={{ paddingRight: '40px' }}
                  placeholder="At least 8 characters"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium mb-1.5">Confirm password</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-base"
                  style={{ paddingRight: '40px' }}
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full" style={{ padding: '12px 20px' }}>
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
          </form>

          <p className="mt-6 text-sm text-center text-[color:var(--color-text-muted)]">
            Already have an account?{' '}
            <Link href="/login" className="link" style={{ fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
