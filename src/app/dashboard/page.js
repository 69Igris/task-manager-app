'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [stats, setStats] = useState({ projects: 0, tasks: 0, inProgress: 0, completed: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        fetchWithAuth('/api/projects'),
        fetchWithAuth('/api/tasks'),
      ]);

      const projectsData = await projectsRes.json();
      const tasksData = await tasksRes.json();

      setProjects(projectsData.projects || []);
      setTasks(tasksData.tasks || []);

      // Calculate stats
      const taskList = tasksData.tasks || [];
      setStats({
        projects: projectsData.projects?.length || 0,
        tasks: taskList.length,
        inProgress: taskList.filter(t => t.status === 'in-progress').length,
        completed: taskList.filter(t => t.status === 'done').length,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetchWithAuth('/api/projects', {
        method: 'POST',
        body: JSON.stringify(newProject),
      });

      if (response.ok) {
        setNewProject({ name: '', description: '' });
        setShowCreateProject(false);
        fetchData();
        showToast('Project created successfully!', 'success');
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to create project', 'error');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      showToast('Error creating project', 'error');
    }
  };

  const canCreateProject = ['admin', 'supervisor', 'manager'].includes(user?.role);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="text-xs sm:text-sm font-medium text-gray-600">Total Projects</div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.projects}</div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="text-xs sm:text-sm font-medium text-gray-600">Total Tasks</div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.tasks}</div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="text-xs sm:text-sm font-medium text-gray-600">In Progress</div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1 sm:mt-2">{stats.inProgress}</div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="text-xs sm:text-sm font-medium text-gray-600">Completed</div>
          <div className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2">{stats.completed}</div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Projects</h2>
          {canCreateProject && (
            <button
              onClick={() => setShowCreateProject(!showCreateProject)}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
            >
              {showCreateProject ? 'Cancel' : '+ New Project'}
            </button>
          )}
        </div>

        {showCreateProject && (
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b">
            <form onSubmit={createProject} className="space-y-3 sm:space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Project name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <textarea
                  placeholder="Description (optional)"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="2"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                Create Project
              </button>
            </form>
          </div>
        )}

        <div className="p-4 sm:p-6">
          {projects.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No projects yet. Create your first project!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-md transition active:scale-98"
                >
                  <h3 className="font-semibold text-gray-900 text-base sm:text-lg">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span className="truncate mr-2">Owner: {project.owner?.name}</span>
                    <span className="whitespace-nowrap">{project._count?.tasks || 0} tasks</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">My Tasks</h2>
        </div>
        <div className="p-4 sm:p-6">
          {tasks.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No tasks assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <Link
                  key={task.id}
                  href={`/dashboard/projects/${task.projectId}`}
                  className="block p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-indigo-500 transition active:scale-98"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{task.title}</h4>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">{task.project?.name}</p>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                        task.status === 'done' ? 'bg-green-100 text-green-800' :
                        task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
