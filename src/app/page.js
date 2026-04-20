'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    router.push(accessToken ? '/dashboard' : '/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div
        className="h-5 w-5 rounded-full border-2 border-gray-200 animate-spin"
        style={{ borderTopColor: 'var(--color-accent)' }}
        aria-label="Loading"
      />
    </div>
  );
}
