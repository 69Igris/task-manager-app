'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
  });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showComments, setShowComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [showAddMember, setShowAddMember] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [memberDetails, setMemberDetails] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const projectRes = await fetchWithAuth(`/api/projects/${id}`);
      const tasksRes = await fetchWithAuth(`/api/tasks?projectId=${id}`);

      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData.project);
        
        // Fetch all users separately for better control
        const allUsersRes = await fetchWithAuth('/api/users');
        if (allUsersRes.ok) {
          const usersData = await allUsersRes.json();
          setAllUsers(usersData.users || []);
          
          // For admin: show all users, otherwise show project members only
          if (user.role === 'admin') {
            setAvailableUsers(usersData.users || []);
          } else {
            const users = [projectData.project.owner, ...(projectData.project.members || [])];
            setAvailableUsers(users);
          }
          
          // Fetch member details (include owner + members)
          const memberIds = projectData.project.members || [];
          const ownerId = projectData.project.ownerId;
          
          // Get owner and all members
          const allMemberIds = [ownerId, ...memberIds];
          const members = usersData.users.filter(u => allMemberIds.includes(u.id));
          setMemberDetails(members);
        }
      } else {
        router.push('/dashboard');
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error loading project data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetchWithAuth('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...newTask,
          projectId: id,
        }),
      });

      if (response.ok) {
        setNewTask({ title: '', description: '', priority: 'medium', assignedTo: '' });
        setShowCreateTask(false);
        fetchData();
        showToast('Task created successfully!', 'success');
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to create task', 'error');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      showToast('Error creating task', 'error');
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchData();
        showToast('Task status updated!', 'success');
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to update task', 'error');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      showToast('Error updating task', 'error');
    }
  };

  const fetchComments = async (taskId) => {
    if (comments[taskId]) {
      setShowComments({ ...showComments, [taskId]: !showComments[taskId] });
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments({ ...comments, [taskId]: data.comments });
        setShowComments({ ...showComments, [taskId]: true });
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const addComment = async (taskId) => {
    const content = newComment[taskId];
    if (!content?.trim()) return;

    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        setNewComment({ ...newComment, [taskId]: '' });
        // Refresh comments
        const commentsRes = await fetchWithAuth(`/api/tasks/${taskId}/comments`);
        if (commentsRes.ok) {
          const data = await commentsRes.json();
          setComments({ ...comments, [taskId]: data.comments });
          showToast('Comment added!', 'success');
        }
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to add comment', 'error');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast('Error adding comment', 'error');
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    
    if (!selectedMember) {
      showToast('Please select a user', 'warning');
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/projects/${id}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId: selectedMember }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowAddMember(false);
        setSelectedMember('');
        fetchData();
        showToast(data.message || 'Member added successfully!', 'success');
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to add member', 'error');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      showToast('Error adding member', 'error');
    }
  };

  const removeMember = async (userId) => {
    const confirmed = await showConfirm({
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member from the project?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'warning',
    });

    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/api/projects/${id}/members`, {
        method: 'DELETE',
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        fetchData();
        showToast('Member removed successfully!', 'success');
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to remove member', 'error');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      showToast('Error removing member', 'error');
    }
  };

  const deleteProject = async () => {
    const confirmed = await showConfirm({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project? This will delete all tasks and comments associated with it. This action cannot be undone.',
      confirmText: 'Delete Project',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('Project deleted successfully!', 'success');
        router.push('/dashboard');
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to delete project', 'error');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      showToast('Error deleting project', 'error');
    }
  };

  const canCreateTask = ['admin', 'supervisor', 'manager'].includes(user?.role);
  const canManageMembers = user?.id === project?.ownerId || ['admin', 'supervisor'].includes(user?.role);
  const canDeleteProject = user?.id === project?.ownerId || user?.role === 'admin';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!project) {
    return <div className="text-center py-8">Project not found</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Project Header */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 mt-2 text-sm sm:text-base">{project.description}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-500">
              <span>Owner: {project.owner?.name}</span>
              <span className="hidden sm:inline">•</span>
              <span>{tasks.length} tasks</span>
              <span className="hidden sm:inline">•</span>
              <span>{memberDetails.length} members</span>
            </div>
          </div>
          {canDeleteProject && (
            <div className="w-full sm:w-auto">
              <button
                onClick={deleteProject}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Delete Project
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Members Section */}
      {canManageMembers && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Project Members</h2>
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
            >
              {showAddMember ? 'Cancel' : '+ Add Member'}
            </button>
          </div>

          {showAddMember && (
            <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b">
              <form onSubmit={addMember} className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select a user to add</option>
                  {allUsers && allUsers.length > 0 ? (
                    allUsers
                      .filter(u => u.id !== project.ownerId && !project.members?.includes(u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email}) - {u.role}
                        </option>
                      ))
                  ) : (
                    <option disabled>Loading users...</option>
                  )}
                </select>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md whitespace-nowrap"
                >
                  Add
                </button>
              </form>
            </div>
          )}

          <div className="p-4 sm:p-6">
            {memberDetails.length === 0 ? (
              <p className="text-center text-gray-500 py-4 text-sm">No members yet. Add team members to collaborate!</p>
            ) : (
              <div className="space-y-2">
                {memberDetails.map((member) => (
                  <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-600 font-semibold text-sm">
                          {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                          {member.name}
                          {member.id === project.ownerId && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">Owner</span>
                          )}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                      <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                        member.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        member.role === 'supervisor' ? 'bg-blue-100 text-blue-800' :
                        member.role === 'manager' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {member.role}
                      </span>
                      {member.id !== project.ownerId && (
                        <button
                          onClick={() => removeMember(member.id)}
                          className="text-red-600 hover:text-red-800 active:text-red-900 text-xs sm:text-sm font-medium whitespace-nowrap"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Tasks</h2>
          {canCreateTask && (
            <button
              onClick={() => setShowCreateTask(!showCreateTask)}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
            >
              {showCreateTask ? 'Cancel' : '+ New Task'}
            </button>
          )}
        </div>

        {showCreateTask && (
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b">
            <form onSubmit={createTask} className="space-y-3 sm:space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <textarea
                  placeholder="Description (optional)"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="2"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Assign to {user.role === 'admin' && <span className="text-xs text-gray-500 hidden sm:inline">(all users available)</span>}
                  </label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Unassigned</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.role && user.role === 'admin' && `(${u.role})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                Create Task
              </button>
            </form>
          </div>
        )}

        <div className="p-4 sm:p-6">
          {tasks.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">No tasks yet. Create your first task!</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{task.title}</h3>
                      {task.description && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="truncate">Assigned: {task.assignedToUser?.name || 'Unassigned'}</span>
                        {task.createdAt && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-2">
                      <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.priority}
                      </span>
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded border ${
                          task.status === 'done' ? 'bg-green-100 text-green-800 border-green-300' :
                          task.status === 'in-progress' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          'bg-gray-100 text-gray-800 border-gray-300'
                        }`}
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                    <button
                      onClick={() => fetchComments(task.id)}
                      className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {showComments[task.id] ? '▼' : '▶'} Comments ({comments[task.id]?.length || 0})
                    </button>

                    {showComments[task.id] && (
                      <div className="mt-3 space-y-2 sm:space-y-3">
                        {comments[task.id]?.map((comment) => (
                          <div key={comment.id} className="bg-gray-50 p-2 sm:p-3 rounded">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                              <span className="text-xs sm:text-sm font-medium text-gray-900">{comment.author?.name}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-700">{comment.content}</p>
                          </div>
                        ))}

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            placeholder="Add a comment..."
                            value={newComment[task.id] || ''}
                            onChange={(e) => setNewComment({ ...newComment, [task.id]: e.target.value })}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md"
                            onKeyPress={(e) => e.key === 'Enter' && addComment(task.id)}
                          />
                          <button
                            onClick={() => addComment(task.id)}
                            className="w-full sm:w-auto px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
