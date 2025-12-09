'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user && mounted) {
      router.push('/login');
    }
  }, [user, loading, router, mounted]);

  if (loading || !user || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const roleColors = {
    admin: 'bg-red-100 text-red-800',
    supervisor: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    worker: 'bg-green-100 text-green-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Task Manager</h1>
              <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                {user.role.toUpperCase()}
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <nav className="flex space-x-2">
                <a href="/dashboard" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-md">
                  Dashboard
                </a>
                {user.role === 'admin' && (
                  <a href="/dashboard/users" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-md">
                    Users
                  </a>
                )}
              </nav>
              <span className="text-sm text-gray-700">{user.name}</span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Logout
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-indigo-600 hover:bg-gray-100"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
              <div className="space-y-1">
                <div className="px-3 py-2 border-b border-gray-200 mb-2">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                </div>
                <a 
                  href="/dashboard" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-100"
                >
                  Dashboard
                </a>
                {user.role === 'admin' && (
                  <a 
                    href="/dashboard/users" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-100"
                  >
                    Users
                  </a>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
