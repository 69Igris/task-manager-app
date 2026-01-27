'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, fetchWithAuth } = useAuth();
  const [stats, setStats] = useState({
    completedTasks: 0,
    pendingTasks: 0,
    dailyCompletion: [],
    upcomingTasks: []
  });
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = previous week, etc.
  const [allTasks, setAllTasks] = useState([]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (allTasks.length > 0) {
      updateStatsForWeek();
    }
  }, [weekOffset, allTasks]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all tasks assigned to the user
      const response = await fetchWithAuth('/api/tasks?myTasks=true');
      const data = await response.json();
      
      if (response.ok) {
        const tasks = data.tasks || [];
        setAllTasks(tasks);
        
        // Calculate completed and pending tasks (overall)
        const completed = tasks.filter(t => t.status === 'completed').length;
        const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in-progress').length;
        
        // Calculate daily completion for the current week
        const dailyCompletion = calculateDailyCompletion(tasks, 0);
        
        // Get upcoming tasks in next 7 days
        const upcoming = getUpcomingTasks(tasks);
        
        setStats({
          completedTasks: completed,
          pendingTasks: pending,
          dailyCompletion,
          upcomingTasks: upcoming
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatsForWeek = () => {
    const dailyCompletion = calculateDailyCompletion(allTasks, weekOffset);
    setStats(prev => ({
      ...prev,
      dailyCompletion
    }));
  };

  const calculateDailyCompletion = (tasks, offset = 0) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + (offset * 7));
    
    const dailyData = [];
    
    // Get data for 7 days starting from the offset week
    for (let i = 6; i >= 0; i--) {
      const date = new Date(startDate);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const completedOnDay = tasks.filter(task => {
        if (!task.completedAt) return false;
        const completedDate = new Date(task.completedAt);
        return completedDate >= date && completedDate < nextDay;
      }).length;
      
      dailyData.push({
        day: days[date.getDay()],
        date: date,
        count: completedOnDay
      });
    }
    
    return dailyData;
  };

  const getUpcomingTasks = (tasks) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    
    return tasks.filter(task => {
      if (!task.dueDate || task.status === 'completed') return false;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today && dueDate <= sevenDaysLater;
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getMaxCount = () => {
    const max = Math.max(...stats.dailyCompletion.map(d => d.count));
    return max === 0 ? 1 : max;
  };

  const getWeekDateRange = () => {
    if (stats.dailyCompletion.length === 0) return '';
    const firstDay = stats.dailyCompletion[0].date;
    const lastDay = stats.dailyCompletion[stats.dailyCompletion.length - 1].date;
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    return `${formatDate(firstDay)} - ${formatDate(lastDay)}`;
  };

  const canGoForward = () => weekOffset < 0;
  const canGoBack = () => {
    // Limit to showing last 12 weeks
    return weekOffset > -12;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Page Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
        <p className="text-sm text-gray-600 mt-1">Your task overview and statistics</p>
      </div>

      {/* Basic Information Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
            <span className="text-4xl font-bold text-blue-600">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-1">{user?.name}</h3>
            <p className="text-blue-100 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Tasks Overview */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Tasks Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-xl p-6 text-center border border-blue-100">
            <div className="text-4xl font-bold text-gray-900 mb-2">{stats.completedTasks}</div>
            <div className="text-sm text-gray-600">Completed Tasks</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-6 text-center border border-purple-100">
            <div className="text-4xl font-bold text-gray-900 mb-2">{stats.pendingTasks}</div>
            <div className="text-sm text-gray-600">Pending Tasks</div>
          </div>
        </div>
      </div>

      {/* Daily Completion Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900">Completion of Daily Tasks</h3>
        </div>
        
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <button
            onClick={() => setWeekOffset(prev => prev - 1)}
            disabled={!canGoBack()}
            className={`p-2 rounded-lg transition-colors ${
              canGoBack() 
                ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100' 
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-900">
              {weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `${Math.abs(weekOffset)} Weeks Ago`}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{getWeekDateRange()}</div>
          </div>
          
    <button
      onClick={() => setWeekOffset(prev => prev + 1)}
      disabled={!canGoForward()}
      className={`p-2 rounded-lg transition-colors ${
        canGoForward() 
          ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100' 
          : 'text-gray-300 cursor-not-allowed'
      }`}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>

  {/* Chart Bars */}
        
        <div className="relative h-48 flex items-end justify-between gap-2 pt-4">
          {stats.dailyCompletion.map((day, index) => {
            const maxCount = getMaxCount();
            const height = (day.count / maxCount) * 100;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex items-end justify-center h-40 pb-2">
                  <div 
                    className="w-full bg-blue-500 rounded-t-lg transition-all duration-500 hover:bg-blue-600 relative group flex items-center justify-center"
                    style={{ height: `${height}%`, minHeight: day.count > 0 ? '8px' : '0' }}
                  >
                    {day.count > 0 && (
                      <>
                        <span className="text-white font-bold text-xl">{day.count}</span>
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {day.count} task{day.count !== 1 ? 's' : ''}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-center mt-2">
                  <div className="text-xs text-gray-600 font-medium">{day.day}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {`${day.date.getDate()}/${day.date.getMonth() + 1}/${day.date.getFullYear().toString().slice(-2)}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-center mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {stats.dailyCompletion.reduce((sum, d) => sum + d.count, 0)} tasks completed this week
          </div>
        </div>
      </div>

      {/* Tasks in Next 7 Days */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Tasks in Next 7 Days</h3>
        
        {stats.upcomingTasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-300 text-5xl mb-3">📅</div>
            <p className="text-gray-500 text-sm">No upcoming tasks in the next 7 days</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.upcomingTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{task.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {task.equipment && <span className="mr-2">⚙️ {task.equipment}</span>}
                  </div>
                </div>
                <div className="ml-3 text-right">
                  <div className="text-xs font-medium text-blue-600">{formatDate(task.dueDate)}</div>
                  <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {task.priority}
                  </div>
                </div>
              </div>
            ))}
            
            {stats.upcomingTasks.length > 5 && (
              <div className="text-center pt-2">
                <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View all {stats.upcomingTasks.length} upcoming tasks →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Export Data</h3>
            <p className="text-sm text-gray-600">Download your tasks as CSV file</p>
          </div>
          <Link 
            href="/dashboard/export"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </Link>
        </div>
      </div>
    </div>
  );
}
