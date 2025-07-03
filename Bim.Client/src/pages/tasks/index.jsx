import React, { useState, useContext, useEffect, useCallback } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { AuthContext } from '../../context/AuthContext';
import styles from './tasks.module.css';  // Chemin d'importation corrigé
import { taskService } from '../../services/taskService';
import { userService } from '../../services/userService';

// Helper functions for styling
const getStatusColor = (status) => {
  switch (status) {
    case 'Not Started': return styles.statusNotStarted;
    case 'In Progress': return styles.statusInProgress;
    case 'Under Review': return styles.statusUnderReview;
    case 'Completed': return styles.statusCompleted;
    default: return '';
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'Low': return styles.priorityLow;
    case 'Medium': return styles.priorityMedium;
    case 'High': return styles.priorityHigh;
    case 'Urgent': return styles.priorityUrgent;
    default: return '';
  }
};

const TasksPage = ({ isAdminView = false }) => {
  const { isAuthenticated, userData, isAdmin, isLoading: authLoading } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    assignedTo: '',
    priority: 'Medium',
    status: 'Not Started'
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');

  const statusOptions = [
    'Not Started',
    'In Progress',
    'Under Review',
    'Completed'
  ];

  const priorityOptions = [
    'Low',
    'Medium',
    'High',
    'Urgent'
  ];

  // Debug logging
  useEffect(() => {
    console.log('TasksPage - Auth State:', {
      isAuthenticated,
      isAdmin,
      userData,
      authLoading
    });
  }, [isAuthenticated, isAdmin, userData, authLoading]);
  // Load tasks when auth is ready
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadTasks();
      if (isAdmin) {
        loadUsers();
      }
    }
  }, [isAuthenticated, isAdmin, authLoading, loadTasks]);

  // Define loadTasks with useCallback to prevent useEffect dependency issues
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      let tasksData;
      
      if (isAdminView && isAdmin) {
        // Admin view: load all tasks
        tasksData = await taskService.getAllTasks();
      } else {
        // User view: load only assigned tasks
        tasksData = await taskService.getUserTasks(userData?.id);
      }
      
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setError(null);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError("Erreur lors du chargement des tâches");
    } finally {
      setLoading(false);
    }
  }, [isAdminView, isAdmin, userData]);

  // Load tasks with proper filtering based on admin view
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadTasks();
    }
  }, [isAuthenticated, authLoading, loadTasks]);

  const loadUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err) {    console.error('Error loading users:', err);
    }
  };
  
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      setError('Only administrators can create tasks');
      return;
    }

    // Validate title field
    if (!newTask.title?.trim()) {
      setError('Le titre de la tâche est requis');
      return;
    }

    try {      // Validate required fields
      if (!newTask.assignedTo) {
        setError('L\'attribution est requise');
        return;
      }

      // Format the task data with proper casing for the backend
      const formattedTask = {
        Title: newTask.title.trim(),
        Description: newTask.description?.trim() || "",
        Status: newTask.status || "Not Started",
        Priority: newTask.priority || "Medium",
        DueDate: newTask.dueDate || null,
        AssignedToId: String(newTask.assignedTo),
        ProjectId: 1 // Make sure this project exists in your database
      };

      await taskService.createTask(formattedTask);
      setError(null);

      // Reset form
      setNewTask({
        title: '',
        description: '',
        dueDate: '',
        assignedTo: '',
        priority: 'Medium',
        status: 'Not Started'
      });
      
      setIsModalOpen(false);
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };
  // Filter tasks based on current view and filters
  const filteredTasks = tasks.filter(task => {
    const statusMatch = filterStatus === 'all' || task.status === filterStatus;
    
    // Vérification flexible de l'assignation pour gérer différentes structures de données
    const assigneeMatch = 
      filterAssignee === 'all' || 
      String(task.assignedTo) === String(filterAssignee) ||
      String(task.assignedToId) === String(filterAssignee) ||
      (task.assignedUser && String(task.assignedUser.id) === String(filterAssignee)) ||
      (task.assignedUser && task.assignedUser.name && task.assignedUser.name.includes(filterAssignee));
      
    return statusMatch && assigneeMatch;
  });

  // Admin-specific actions
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (err) {
      setError("Erreur lors de la mise à jour du statut");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!isAdmin) return;
    
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      try {
        await taskService.deleteTask(taskId);
        setTasks(tasks.filter(task => task.id !== taskId));
      } catch (err) {
        setError("Erreur lors de la suppression de la tâche");
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.messageContainer}>
        <p>Please log in to view tasks.</p>
      </div>
    );
  }

  return (
    <div className={styles.tasksContainer}>
      <div className={styles.header}>
        <h1>{isAdminView ? 'Gestion des tâches' : 'Mes tâches'}</h1>
        <div className={styles.actions}>
          <button 
            className={styles.addButton}
            onClick={() => setIsModalOpen(true)}
          >
            {isAdminView ? 'Nouvelle tâche' : 'Ajouter une tâche'}
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">Tous les statuts</option>
          {statusOptions.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        {isAdminView && (
          <select 
            value={filterAssignee} 
            onChange={(e) => setFilterAssignee(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Tous les assignés</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loader}></div>
        </div>
      ) : error ? (
        <div className={styles.errorContainer}>
          <p>{error}</p>
        </div>
      ) : (
        <div className={styles.tasksList}>
          {filteredTasks.length === 0 ? (
            <p className={styles.noTasks}>No tasks found</p>
          ) : (
            filteredTasks.map((task) => (
              <div key={task.id} className={`${styles.taskCard} ${getStatusColor(task.status)}`}>
                <div className={styles.taskHeader}>
                  <h3>{task.title}</h3>
                  <span className={`${styles.priorityBadge} ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <p className={styles.taskDescription}>{task.description}</p>
                <div className={styles.taskMeta}>
                  <p className={styles.assignedTo}>
                    <span>Assigned to:</span> {task.assignedUser?.name || 'Unassigned'}
                  </p>
                  {task.dueDate && (
                    <p className={styles.dueDate}>
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className={styles.taskStatus}>
                  <span>Status:</span>
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    className={`${styles.statusSelect} ${getStatusColor(task.status)}`}
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                {isAdmin && (
                  <div className={styles.adminActions}>
                    <button 
                      className={styles.deleteButton}
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete Task"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}      {isAdmin && (
        <>
          <button 
            className={styles.fabButton}
            onClick={() => setIsModalOpen(true)}
            title="Add New Task"
          >
            +
          </button>

          {isModalOpen && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <h2>Create New Task</h2>
                  <button 
                    className={styles.closeButton}
                    onClick={() => setIsModalOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={handleCreateTask}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Title</label>
                      <input
                        type="text"
                        placeholder="Task Title"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        required
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Assigned To</label>
                      <select
                        className={styles.input}
                        value={newTask.assignedTo}
                        onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                        required
                      >
                        <option value="">Select User</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Priority</label>
                      <select
                        className={styles.input}
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      >
                        {priorityOptions.map(priority => (
                          <option key={priority} value={priority}>{priority}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Due Date</label>
                      <input
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      placeholder="Task Description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className={styles.textarea}
                      required
                    />
                  </div>
                  <div className={styles.modalActions}>
                    <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className={styles.button}>
                      Create Task
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TasksPage;
