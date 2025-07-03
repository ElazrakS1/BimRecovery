import React, { useState, useContext, useEffect, useCallback } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { taskService } from '../services/taskService';
import { userService } from '../services/userService';
import { getProjects } from '../services/projectService';
import styles from './TasksNew.module.css';
import NotificationsContainer from '../components/notifications/NotificationsContainer';

const Tasks = () => {
  console.log('Tasks component loaded');
  const { texts } = useContext(LanguageContext);
  const { isAuthenticated, userData } = useContext(AuthContext);  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [highlightedTaskId] = useState(null);  const [_users, setUsers] = useState([]);
  const [_projects, setProjects] = useState([]);
  const [_loadingProjects, setLoadingProjects] = useState(false);
  // Load tasks based on admin status
  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const data = isAdmin ? 
        await taskService.getAllTasks() : 
        await taskService.getUserTasks();

      setTasks(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Error loading tasks');    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin]);

  // Load initial data
  useEffect(() => {
    if (userData) {
      const hasAdminRole = 
        userData.roles?.includes('Admin') || 
        userData.role === 'Admin' || 
        (Array.isArray(userData.userRoles) && userData.userRoles.some(r => r === 'Admin'));
      
      setIsAdmin(hasAdminRole);
    }
  }, [userData]);

  useEffect(() => {
    if (isAuthenticated) {
      const loadUsers = async () => {
        try {
          const data = await userService.getAllUsers();
          setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Error loading users:', err);
          setUsers([]);
        }
      };

      const loadProjects = async () => {
        try {
          setLoadingProjects(true);
          const data = await getProjects();
          setProjects(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Error loading projects:', err);
          setProjects([]);
        } finally {
          setLoadingProjects(false);
        }
      };      loadUsers();
      loadProjects();
      fetchTasks();
    }
  }, [isAuthenticated, fetchTasks]);

  // Authentication check
  if (!isAuthenticated) {
    return (
      <div className={styles.messageContainer}>
        <p className={styles.message}>Please log in to view tasks.</p>
        <a href="/login" className={styles.loginButton}>Login</a>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Loading tasks...</p>
      </div>
    );
  }

  // Main render
  return (
    <div className={styles.tasksWrapper}>
      <div className={styles.header}>
        <h1>{texts.tasks || 'Tasks'}</h1>
        <p>{texts.tasksSubtitle || 'Manage and track your tasks in real-time'}</p>
      </div>

      <NotificationsContainer 
        notifications={notifications}
        onNotificationClose={(id) => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }}
      />

      {error && (
        <div className={styles.errorContainer}>
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className={styles.taskList}>
        {tasks.map(task => (
          <div 
            key={task.id} 
            className={`${styles.taskCard} ${task.id === highlightedTaskId ? styles.highlighted : ''}`}
          >
            <div className={styles.taskHeader}>
              <h3 className={styles.taskTitle}>{task.Title}</h3>
              <span className={`${styles.priorityBadge} ${styles[task.Priority?.toLowerCase() || 'medium']}`}>
                {task.Priority || 'Medium'}
              </span>
            </div>
            
            <div className={styles.taskDetails}>
              <div className={styles.detailRow}>
                <i className="fas fa-user"></i>
                <span>{task.AssignedToId || 'Unassigned'}</span>
              </div>
              <div className={styles.detailRow}>
                <i className="fas fa-calendar"></i>
                <span>{task.DueDate ? new Date(task.DueDate).toLocaleDateString() : 'No due date'}</span>
              </div>
              <div className={styles.detailRow}>
                <i className="fas fa-info-circle"></i>
                <span>{task.Status || 'Pending'}</span>
              </div>
            </div>
          </div>
        ))}
        
        {tasks.length === 0 && (
          <div className={styles.emptyState}>
            <p>No tasks yet.</p>
          </div>
        )}      </div>
    </div>
  );
}

// Export Tasks component
export default Tasks;
