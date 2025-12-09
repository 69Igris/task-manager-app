'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const { user, fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await fetchWithAuth('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        showToast('Failed to load users', 'error');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Error loading users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    setUpdating(userId);
    try {
      const response = await fetchWithAuth(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        showToast('User role updated successfully', 'success');
        fetchUsers();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to update role', 'error');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      showToast('Error updating user role', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const deleteUser = async (userId, userName) => {
    const confirmed = await showConfirm({
      title: 'Delete User',
      message: `Are you sure you want to delete user "${userName}"? This will delete all their projects, tasks, and comments. This action cannot be undone.`,
      confirmText: 'Delete User',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    setUpdating(userId);
    try {
      const response = await fetchWithAuth(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        showToast(data.message || 'User deleted successfully', 'success');
        fetchUsers();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to delete user', 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Error deleting user', 'error');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const roleColors = {
    admin: 'bg-red-100 text-red-800 border-red-300',
    supervisor: 'bg-purple-100 text-purple-800 border-purple-300',
    manager: 'bg-blue-100 text-blue-800 border-blue-300',
    worker: 'bg-green-100 text-green-800 border-green-300',
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Management</h1>
        <span className="text-xs sm:text-sm text-gray-500">{users.length} total users</span>
      </div>

      {/* Mobile View - Card Layout */}
      <div className="lg:hidden space-y-3">
        {users.map((u) => (
          <div key={u.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{u.name}</h3>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${roleColors[u.role]} whitespace-nowrap ml-2`}>
                {u.role.toUpperCase()}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Change Role:</label>
                <select
                  value={u.role}
                  onChange={(e) => updateUserRole(u.id, e.target.value)}
                  disabled={updating === u.id || u.id === user.id}
                  className="text-xs border border-gray-300 rounded-md px-2 py-1 disabled:opacity-50"
                >
                  <option value="worker">Worker</option>
                  <option value="manager">Manager</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                <span>Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                {u.id !== user.id ? (
                  <button
                    onClick={() => deleteUser(u.id, u.name)}
                    disabled={updating === u.id}
                    className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                  >
                    Delete
                  </button>
                ) : (
                  <span className="text-gray-400">(You)</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop View - Table Layout */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Change Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{u.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{u.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${roleColors[u.role]}`}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={u.role}
                    onChange={(e) => updateUserRole(u.id, e.target.value)}
                    disabled={updating === u.id || u.id === user.id}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="worker">Worker</option>
                    <option value="manager">Manager</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                  </select>
                  {u.id === user.id && (
                    <span className="ml-2 text-xs text-gray-500">(You)</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {u.id !== user.id ? (
                    <button
                      onClick={() => deleteUser(u.id, u.name)}
                      disabled={updating === u.id}
                      className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
