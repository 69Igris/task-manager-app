'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AssignedByMePage() {
  const { user, fetchWithAuth } = useAuth();
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    dailyCompletion: [],
    upcomingTasks: []
  });
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
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
      
      // Fetch all tasks created by the user (assigned to others)
      const response = await fetchWithAuth('/api/tasks?createdByMe=true');
      const data = await response.json();
      
      if (response.ok) {
        const tasks = data.tasks || [];
        setAllTasks(tasks);
        
        // Calculate overall task statistics
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const pending = tasks.filter(t => t.status === 'pending').length;
        const inProgress = tasks.filter(t => t.status === 'in-progress').length;
        const overdue = tasks.filter(t => {
          if (!t.dueDate || t.status === 'completed') return false;
          const dueDate = new Date(t.dueDate);
          dueDate.setHours(23, 59, 59, 999);
          return dueDate < new Date();
        }).length;
        
        // Calculate daily completion for the current week
        const dailyCompletion = calculateDailyCompletion(tasks, 0);
        
        // Get upcoming tasks in next 7 days
        const upcoming = getUpcomingTasks(tasks);
        
        setStats({
          totalTasks: total,
          completedTasks: completed,
          pendingTasks: pending,
          inProgressTasks: inProgress,
          overdueTasks: overdue,
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
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + (offset * 7));
    
    const dailyData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(startDate);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const tasksOnDay = tasks.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === date.getTime();
      });

      const completed = tasksOnDay.filter(t => t.status === 'completed').length;
      const inProgress = tasksOnDay.filter(t => t.status === 'in-progress').length;
      const pending = tasksOnDay.filter(t => t.status === 'pending').length;
      const overdue = tasksOnDay.filter(t => {
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(23, 59, 59, 999);
        return t.status !== 'completed' && dueDate < today;
      }).length;
      
      dailyData.push({
        day: days[date.getDay()],
        date: date,
        counts: {
          completed,
          inProgress,
          pending,
          overdue
        },
        total: tasksOnDay.length
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
    const totalCounts = stats.dailyCompletion.map(d => d.total || 0);
    const max = Math.max(...totalCounts);
    return max === 0 || max === -Infinity ? 1 : max;
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
  const canGoBack = () => weekOffset > -12;

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
        <h2 className="text-2xl font-bold text-gray-900">Assigned by Me</h2>
        <p className="text-sm text-gray-600 mt-1">Tasks you've assigned to others</p>
      </div>

      {/* Basic Information Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
            <span className="text-4xl">📝</span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-1">Task Creator</h3>
            <p className="text-purple-100 text-sm">Manage tasks assigned to your team</p>
          </div>
        </div>
      </div>

      {/* Tasks Overview */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Tasks Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Link href="/dashboard?filter=all&createdByMe=true" className="block">
            <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100 shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer">
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalTasks}</div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total</div>
            </div>
          </Link>
          <Link href="/dashboard?filter=pending&createdByMe=true" className="block">
            <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100 shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer">
              <div className="text-3xl font-bold text-amber-600 mb-1">{stats.pendingTasks}</div>
              <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Pending</div>
            </div>
          </Link>
          <Link href="/dashboard?filter=in-progress&createdByMe=true" className="block">
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100 shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer">
              <div className="text-3xl font-bold text-blue-600 mb-1">{stats.inProgressTasks}</div>
              <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">In Progress</div>
            </div>
          </Link>
          <Link href="/dashboard?filter=completed&createdByMe=true" className="block">
            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100 shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer">
              <div className="text-3xl font-bold text-green-600 mb-1">{stats.completedTasks}</div>
              <div className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Completed</div>
            </div>
          </Link>
          <Link href="/dashboard?filter=overdue&createdByMe=true" className="block">
            <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100 shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer">
              <div className="text-3xl font-bold text-red-600 mb-1">{stats.overdueTasks}</div>
              <div className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Overdue</div>
            </div>
          </Link>
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
            const totalHeight = day.total > 0 ? (day.total / maxCount) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center group relative">
                {/* Stacked Bar Container */}
                <div className="w-full flex flex-col-reverse items-center justify-start h-40 pb-2">
                  {/* Completed Segment */}
                  {day.counts?.completed > 0 && (
                    <div 
                      className="w-full bg-green-500 transition-all duration-500 hover:brightness-110 relative"
                      style={{ height: `${(day.counts.completed / (day.total || 1)) * totalHeight}%` }}
                    />
                  )}
                  {/* In Progress Segment */}
                  {day.counts?.inProgress > 0 && (
                    <div 
                      className="w-full bg-blue-500 transition-all duration-500 hover:brightness-110 relative"
                      style={{ height: `${(day.counts.inProgress / (day.total || 1)) * totalHeight}%` }}
                    />
                  )}
                  {/* Pending Segment */}
                  {day.counts?.pending > 0 && (
                    <div 
                      className="w-full bg-amber-500 transition-all duration-500 hover:brightness-110 relative"
                      style={{ height: `${(day.counts.pending / (day.total || 1)) * totalHeight}%` }}
                    />
                  )}
                  {/* Overdue Segment */}
                  {day.counts?.overdue > 0 && (
                    <div 
                      className="w-full bg-red-500 transition-all duration-500 hover:brightness-110 relative rounded-t-sm"
                      style={{ height: `${(day.counts.overdue / (day.total || 1)) * totalHeight}%` }}
                    />
                  )}

                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-[10px] p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                    <div className="font-bold mb-1 border-b border-gray-700 pb-1">{day.total || 0} Total Tasks</div>
                    {day.counts?.completed > 0 && <div className="text-green-400">● {day.counts.completed} Done</div>}
                    {day.counts?.inProgress > 0 && <div className="text-blue-400">● {day.counts.inProgress} Doing</div>}
                    {day.counts?.pending > 0 && <div className="text-amber-400">● {day.counts.pending} To Do</div>}
                    {day.counts?.overdue > 0 && <div className="text-red-400">● {day.counts.overdue} Overdue</div>}
                  </div>

                  {/* Empty state marker if total is 0 */}
                  {day.total === 0 && (
                    <div className="w-1 h-1 bg-gray-200 rounded-full mb-1" />
                  )}
                </div>
                
                <div className="text-center mt-2">
                  <div className="text-[10px] text-gray-600 font-bold uppercase tracking-tight">{day.day}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">
                    {`${day.date.getDate()}/${day.date.getMonth() + 1}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-50 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Doing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">To Do</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Overdue</span>
          </div>
        </div>

        <div className="flex items-center justify-center mt-2">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {stats.dailyCompletion.reduce((sum, d) => sum + (d.total || 0), 0)} Tasks Scheduled This Week
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
                    {task.assignedUsers && task.assignedUsers.length > 0 && (
                      <span>👤 {task.assignedUsers.map(u => u.name).join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="ml-3 text-right">
                  <div className="text-xs font-medium text-purple-600">{formatDate(task.dueDate)}</div>
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
                <Link href="/dashboard?createdByMe=true" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                  View all {stats.upcomingTasks.length} upcoming tasks →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
