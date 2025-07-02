import { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';

// Authentication Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  const API_BASE = 'https://shiftflow.railway.app/api';

  useEffect(() => {
    // Check if user is logged in
    const savedToken = localStorage.getItem('shiftflow_token');
    if (savedToken) {
      setToken(savedToken);
      // Verify token by making a test API call
      fetch(`${API_BASE}/users`, {
        headers: {
          'Authorization': `Bearer ${savedToken}`,
          'Content-Type': 'application/json'
        }
      })
      .then(res => {
        if (res.ok) {
          const userData = JSON.parse(localStorage.getItem('shiftflow_user') || '{}');
          setUser(userData);
        } else {
          localStorage.removeItem('shiftflow_token');
          localStorage.removeItem('shiftflow_user');
          setToken(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('shiftflow_token');
        localStorage.removeItem('shiftflow_user');
        setToken(null);
      })
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('shiftflow_token', data.token);
      localStorage.setItem('shiftflow_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const register = async (organizationData) => {
    try {
      const response = await fetch(`${API_BASE}/auth/register-organization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(organizationData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      localStorage.setItem('shiftflow_token', data.token);
      localStorage.setItem('shiftflow_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('shiftflow_token');
    localStorage.removeItem('shiftflow_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    token,
    API_BASE
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Notification Context
const NotificationContext = createContext();

const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification }}>
      {children}
      <NotificationPanel notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
};

const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

// Notification Panel Component
const NotificationPanel = ({ notifications, onRemove }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`max-w-sm p-4 rounded-lg shadow-lg border-l-4 ${
            notification.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
            notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
            'bg-blue-50 border-blue-500 text-blue-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => onRemove(notification.id)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Main App Content
const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ShiftFlow...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <AuthPages />;
};

// Authentication Pages
const AuthPages = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {isLogin ? <LoginForm /> : <RegisterForm />}
        
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {isLogin ? "Don't have an account? Register your healthcare facility" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Login Form
const LoginForm = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addNotification } = useNotifications();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) {
      addNotification('Please enter both email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      await login(credentials.email, credentials.password);
      addNotification('Login successful!', 'success');
    } catch (error) {
      addNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ShiftFlow</h1>
        <p className="text-gray-600">Healthcare Communication Platform</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            required
            value={credentials.email}
            onChange={(e) => setCredentials({...credentials, email: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={credentials.password}
            onChange={(e) => setCredentials({...credentials, password: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};

// Registration Form
const RegisterForm = () => {
  const [formData, setFormData] = useState({
    organizationName: '',
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { addNotification } = useNotifications();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.organizationName || !formData.adminName || !formData.adminEmail || !formData.adminPassword) {
      addNotification('Please fill in all fields', 'error');
      return;
    }

    if (formData.adminPassword.length < 8) {
      addNotification('Password must be at least 8 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      await register(formData);
      addNotification('Registration successful! Welcome to ShiftFlow!', 'success');
    } catch (error) {
      addNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Join ShiftFlow</h1>
        <p className="text-gray-600">Register Your Healthcare Facility</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Healthcare Facility Name
          </label>
          <input
            type="text"
            required
            value={formData.organizationName}
            onChange={(e) => setFormData({...formData, organizationName: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Metro General Hospital"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Administrator Name
          </label>
          <input
            type="text"
            required
            value={formData.adminName}
            onChange={(e) => setFormData({...formData, adminName: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Administrator Email
          </label>
          <input
            type="email"
            required
            value={formData.adminEmail}
            onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="admin@yourhospital.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={formData.adminPassword}
            onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Minimum 8 characters"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
};

// Main Dashboard
const Dashboard = () => {
  const { user, logout, token, API_BASE } = useAuth();
  const { addNotification } = useNotifications();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);

  // Load tasks
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData) => {
    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });

      if (response.ok) {
        const newTask = await response.json();
        setTasks(prev => [newTask, ...prev]);
        addNotification('Task created successfully!', 'success');
        setShowCreateTask(false);
      } else {
        const error = await response.json();
        addNotification(error.error || 'Failed to create task', 'error');
      }
    } catch (error) {
      addNotification('Failed to create task', 'error');
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
        addNotification('Task updated successfully!', 'success');
      } else {
        const error = await response.json();
        addNotification(error.error || 'Failed to update task', 'error');
      }
    } catch (error) {
      addNotification('Failed to update task', 'error');
    }
  };

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    return {
      todo: tasks.filter(t => t.status === 'todo'),
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      completed: tasks.filter(t => t.status === 'completed'),
      handoff: tasks.filter(t => t.status === 'handoff')
    };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">ShiftFlow</h1>
              <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {user?.organizationName}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateTask(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Task
              </button>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
                <button
                  onClick={logout}
                  className="text-gray-400 hover:text-gray-600"
                  title="Logout"
                >
                  🚪
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="To Do" count={tasksByStatus.todo.length} color="blue" />
          <StatCard title="In Progress" count={tasksByStatus.in_progress.length} color="yellow" />
          <StatCard title="Completed" count={tasksByStatus.completed.length} color="green" />
          <StatCard title="Handoff" count={tasksByStatus.handoff.length} color="purple" />
        </div>

        {/* Kanban Board */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Task Management</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading tasks...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <TaskColumn 
                title="To Do" 
                status="todo" 
                tasks={tasksByStatus.todo} 
                onUpdateStatus={updateTaskStatus}
                color="bg-gray-50"
              />
              <TaskColumn 
                title="In Progress" 
                status="in_progress" 
                tasks={tasksByStatus.in_progress} 
                onUpdateStatus={updateTaskStatus}
                color="bg-yellow-50"
              />
              <TaskColumn 
                title="Completed" 
                status="completed" 
                tasks={tasksByStatus.completed} 
                onUpdateStatus={updateTaskStatus}
                color="bg-green-50"
              />
              <TaskColumn 
                title="Handoff" 
                status="handoff" 
                tasks={tasksByStatus.handoff} 
                onUpdateStatus={updateTaskStatus}
                color="bg-purple-50"
              />
            </div>
          )}
        </div>
      </main>

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onSubmit={createTask}
        />
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, count, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    purple: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <div className="w-6 h-6 flex items-center justify-center font-bold">
            {count}
          </div>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{count}</p>
        </div>
      </div>
    </div>
  );
};

// Task Column Component
const TaskColumn = ({ title, status, tasks, onUpdateStatus, color }) => {
  return (
    <div className={`${color} rounded-lg p-4 min-h-96`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>
      
      <div className="space-y-3">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onUpdateStatus={onUpdateStatus}
          />
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Task Card Component
const TaskCard = ({ task, onUpdateStatus }) => {
  const priorityColors = {
    emergency: 'border-l-red-600 bg-red-50',
    urgent: 'border-l-red-500 bg-red-50',
    normal: 'border-l-blue-500 bg-blue-50',
    low: 'border-l-gray-500 bg-gray-50'
  };

  const getStatusActions = (currentStatus) => {
    const actions = [];
    
    if (currentStatus === 'todo') {
      actions.push({ label: 'Start', status: 'in_progress', color: 'bg-blue-600' });
    }
    
    if (currentStatus === 'in_progress') {
      actions.push({ label: 'Complete', status: 'completed', color: 'bg-green-600' });
      actions.push({ label: 'Handoff', status: 'handoff', color: 'bg-purple-600' });
    }
    
    if (currentStatus === 'handoff') {
      actions.push({ label: 'Complete', status: 'completed', color: 'bg-green-600' });
    }
    
    return actions;
  };

  return (
    <div className={`bg-white rounded-lg border-l-4 shadow-sm p-3 ${priorityColors[task.priority] || priorityColors.normal}`}>
      <h4 className="font-medium text-gray-900 text-sm mb-2">{task.title}</h4>
      
      {task.description && (
        <p className="text-xs text-gray-600 mb-2">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        {task.room_number && <span>Room {task.room_number}</span>}
        {task.priority !== 'normal' && (
          <span className={`px-1 py-0.5 rounded ${
            task.priority === 'urgent' || task.priority === 'emergency' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
          }`}>
            {task.priority}
          </span>
        )}
      </div>

      {task.assigned_user && (
        <p className="text-xs text-gray-600 mb-2">
          Assigned: {task.assigned_user.name}
        </p>
      )}

      <div className="flex flex-wrap gap-1">
        {getStatusActions(task.status).map(action => (
          <button
            key={action.status}
            onClick={() => onUpdateStatus(task.id, action.status)}
            className={`${action.color} text-white text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// Create Task Modal
const CreateTaskModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal',
    room_number: '',
    estimated_duration: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      return;
    }
    
    const taskData = {
      ...formData,
      estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : undefined
    };
    
    onSubmit(taskData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Create New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Enter task description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Number
              </label>
              <input
                type="text"
                value={formData.room_number}
                onChange={(e) => setFormData({...formData, room_number: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 205A"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.estimated_duration}
              onChange={(e) => setFormData({...formData, estimated_duration: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="15"
              min="1"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main App Component
export default function Home() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
