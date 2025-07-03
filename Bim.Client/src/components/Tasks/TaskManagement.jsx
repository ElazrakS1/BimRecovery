import React, { useState, useEffect } from 'react';
import api from '../../config/api.config';
import { userService } from '../../services/userService';
import { taskService } from '../../services/taskService';
import UserSelector from '../common/UserSelector';
import UserValidationAlert from '../common/UserValidationAlert';
import useUserValidation from '../../hooks/useUserValidation';
import './TaskManagement.css';

const TaskManagement = ({ projectId }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [filter, setFilter] = useState({ status: 'all', assignedTo: 'all' });
    const [users, setUsers] = useState([]);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });

    const showNotification = (message, type = 'success', details = '') => {
        setNotification({ 
            show: true, 
            message, 
            type, 
            details, 
            // Plus de temps pour les erreurs complexes
            duration: type === 'error' ? 8000 : 4000 
        });
        
        // Utiliser la durée de la notification pour le timeout
        const timeout = setTimeout(() => {
            setNotification({ show: false, message: '', type: '', details: '' });
        }, type === 'error' ? 8000 : 4000);
        
        return () => clearTimeout(timeout);
    };

    useEffect(() => {
        if (projectId) {
            fetchTasks();
            fetchUsers();
        }
    }, [projectId, filter]);const fetchTasks = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            
            if (filter.status !== 'all') params.append('status', filter.status);
            if (filter.assignedTo !== 'all') params.append('assignedTo', filter.assignedTo);
            
            const response = await api.get(`/api/collaborationtasks/project/${projectId}?${params}`);
            setTasks(response.data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }    };

    const fetchUsers = async () => {
        try {
            console.log('🔍 Fetching users for task assignment...');
            
            // Essayer d'abord la nouvelle méthode spécifique
            const usersData = await userService.getAssignableUsers();
            
            console.log('✅ Users fetched successfully:', {
                count: usersData?.length || 0,
                users: usersData
            });
            
            setUsers(usersData || []);
        } catch (error) {
            console.error('❌ Error fetching users:', error);
            
            // Essayer l'ancienne méthode en cas d'échec
            try {
                console.log('🔄 Trying fallback method...');
                const fallbackUsers = await userService.getAllUsers();
                console.log('✅ Fallback users fetched:', fallbackUsers);
                setUsers(fallbackUsers || []);
            } catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError);
                setUsers([]);
                showNotification('Unable to load users. Please refresh the page.', 'error');
            }
        }
    };    const createTask = async (taskData) => {
        try {
            // Préparer les données de la tâche avec support multi-utilisateurs
            const taskPayload = {
                ...taskData,
                assignedToId: taskData.assignedToId || null, // Maintenu pour compatibilité
                assignedToIds: taskData.assignedToIds || [], // Nouveaux assignés multiples
                projectId: parseInt(projectId)
            };
            
            console.log('Creating task with multiple assignees:', taskPayload);
            
            // Utiliser notre service amélioré pour les tâches collaboratives
            const taskResponse = await taskService.createCollaborativeTask(taskPayload);
            
            setTasks(prev => [taskResponse, ...prev]);
            setShowCreateForm(false);
            
            // Afficher un message de succès avec le nombre d'utilisateurs notifiés
            const assigneeCount = (taskResponse.assignees?.length || taskPayload.assignedToIds?.length || 0);
            if (assigneeCount > 0) {
                showNotification(
                    `Task created successfully! ${assigneeCount} user${assigneeCount > 1 ? 's' : ''} will be notified.`,
                    'success'
                );
            } else {
                showNotification('Task created successfully!', 'success');
            }
        } catch (error) {
            console.error('Error creating task:', error);
            
            // Gérer spécifiquement les erreurs de validation d'utilisateurs
            if (error.isUserValidationError) {
                const message = `Erreur lors de l'assignation des utilisateurs`;
                let details = `${error.message}\n`;
                
                // Afficher les IDs d'utilisateurs invalides
                if (error.invalidUserIds && error.invalidUserIds.length > 0) {
                    details += `\nUtilisateurs invalides:\n- ${error.invalidUserIds.join('\n- ')}`;
                }
                
                // Afficher les suggestions d'utilisateurs valides
                if (error.suggestions && error.suggestions.length > 0) {
                    details += `\n\nSuggestions:\n- ${error.suggestions.join('\n- ')}`;
                }
                
                showNotification(message, 'error', details);
            } else {
                showNotification(
                    'Error creating task. Please try again.',
                    'error',
                    error.message || 'An unexpected error occurred'
                );
            }
        }
    };const updateTask = async (taskId, updates) => {
        try {
            await api.put(`/api/collaborationtasks/${taskId}`, updates);
            // Refresh tasks after update
            fetchTasks();
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return '#ff4444';
            case 'high': return '#ff8800';
            case 'normal': return '#00aa44';
            case 'low': return '#888888';
            default: return '#888888';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'todo': return '#888888';
            case 'in_progress': return '#2196f3';
            case 'review': return '#ff9800';
            case 'completed': return '#4caf50';
            default: return '#888888';
        }
    };

    if (loading) {
        return (
            <div className="task-management-loading">
                <div className="spinner"></div>
                <p>Loading tasks...</p>
            </div>
        );
    }

    return (
        <div className="task-management">
            {/* Notification Toast */}
            {notification.show && (
                <div className={`notification-toast ${notification.type}`}>
                    <div className="notification-content">
                        <span className="notification-message">{notification.message}</span>
                        
                        {notification.details && (
                            <div className="notification-details">
                                <pre>{notification.details}</pre>
                            </div>
                        )}
                    </div>
                    <button 
                        className="notification-close"
                        onClick={() => setNotification({ show: false, message: '', type: '', details: '' })}
                    >
                        ×
                    </button>
                </div>
            )}
            
            <div className="task-management-header">
                <h2>Task Management</h2>
                <div className="task-controls">
                    <div className="task-filters">
                        <select 
                            value={filter.status} 
                            onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="all">All Statuses</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                    <button 
                        className="btn-primary"
                        onClick={() => setShowCreateForm(true)}
                    >
                        Create Task
                    </button>
                </div>
            </div>

            <div className="task-grid">
                {tasks.map(task => (
                    <div key={task.id} className="task-card" onClick={() => setSelectedTask(task)}>
                        <div className="task-header">
                            <h4>{task.title}</h4>
                            <div className="task-badges">
                                <span 
                                    className="priority-badge"
                                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                                >
                                    {task.priority}
                                </span>
                                <span 
                                    className="status-badge"
                                    style={{ backgroundColor: getStatusColor(task.status) }}
                                >
                                    {task.status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                        
                        <p className="task-description">{task.description}</p>
                        
                        <div className="task-progress">
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill"
                                    style={{ width: `${task.progress}%` }}
                                ></div>
                            </div>
                            <span className="progress-text">{task.progress}%</span>
                        </div>

                        <div className="task-meta">
                            <div className="task-assignee">
                                {task.assignees && task.assignees.length > 0 ? (
                                    <div className="assignees-list">
                                        <span className="assignees-label">Assigned to:</span>
                                        <div className="assignees-tags">
                                            {task.assignees.slice(0, 2).map(assignee => (
                                                <span key={assignee.userId} className="assignee-tag">
                                                    {assignee.name}
                                                </span>
                                            ))}
                                            {task.assignees.length > 2 && (
                                                <span className="assignee-tag more">
                                                    +{task.assignees.length - 2} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : task.assignedToName ? (
                                    <span>Assigned to: {task.assignedToName}</span>
                                ) : (
                                    <span className="unassigned">Unassigned</span>
                                )}
                            </div>
                            <div className="task-dates">
                                {task.dueDate && (
                                    <span className="due-date">
                                        Due: {new Date(task.dueDate).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="task-footer">
                            <span className="comments-count">
                                💬 {task.commentsCount} comments
                            </span>
                            <span className="created-date">
                                Created: {new Date(task.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {tasks.length === 0 && (
                <div className="empty-state">
                    <p>No tasks found for this project.</p>
                    <button 
                        className="btn-primary"
                        onClick={() => setShowCreateForm(true)}
                    >
                        Create First Task
                    </button>
                </div>
            )}            {showCreateForm && (
                <TaskCreateForm 
                    onSubmit={createTask}
                    onCancel={() => setShowCreateForm(false)}
                    users={users}
                />
            )}

            {selectedTask && (
                <TaskDetailsModal 
                    task={selectedTask}
                    onUpdate={updateTask}
                    onClose={() => setSelectedTask(null)}
                />
            )}
        </div>
    );
};

const TaskCreateForm = ({ onSubmit, onCancel, users = [] }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'todo',
        priority: 'normal',
        assignedToId: '', // Maintenu pour compatibilité
        assignedToIds: [], // Nouveau champ pour multiple assignees
        dueDate: '',
        tags: ''
    });
    
    // Utiliser notre nouveau hook de validation
    const { 
        validateUsers, 
        lastValidation,
        cleanUserList,
        isLastValidationValid 
    } = useUserValidation();
    
    const [showValidationWarning, setShowValidationWarning] = useState(false);
    const [validationResult, setValidationResult] = useState(null);

    // Gérer le changement de sélection d'utilisateurs
    const handleUserSelectionChange = (selectedUserIds) => {
        setFormData(prev => ({ 
            ...prev, 
            assignedToIds: selectedUserIds,
            // Pour compatibilité, utiliser le premier ID comme assignedToId principal
            assignedToId: selectedUserIds.length > 0 ? selectedUserIds[0] : ''
        }));
    };
    
    // Valider les utilisateurs avant la soumission
    const validateSelectedUsers = async () => {
        if (formData.assignedToIds.length === 0) return true;
        
        const result = await validateUsers(formData.assignedToIds);
        setValidationResult(result);
        
        if (!result.isValid) {
            setShowValidationWarning(true);
            return false;
        }
        
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Valider les utilisateurs avant soumission
        const isValid = await validateSelectedUsers();
        
        if (!isValid && formData.assignedToIds.length > 0) {
            // Si validation échoue mais qu'il y a des utilisateurs valides, offrir de continuer
            if (validationResult && validationResult.validUserIds.length > 0) {
                const confirmMessage = `Certains utilisateurs assignés sont invalides. Voulez-vous continuer avec seulement les ${validationResult.validUserIds.length} utilisateurs valides?`;
                
                if (window.confirm(confirmMessage)) {
                    // Nettoyer la liste et soumettre avec seulement les utilisateurs valides
                    const cleanedData = {
                        ...formData,
                        assignedToIds: validationResult.validUserIds,
                        assignedToId: validationResult.validUserIds.length > 0 ? validationResult.validUserIds[0] : ''
                    };
                    onSubmit(cleanedData);
                }
            } else {
                // Aucun utilisateur valide, proposer de créer sans assignation
                if (window.confirm("Aucun utilisateur valide n'a été sélectionné. Voulez-vous créer la tâche sans assignation?")) {
                    const unassignedData = {
                        ...formData,
                        assignedToIds: [],
                        assignedToId: ''
                    };
                    onSubmit(unassignedData);
                }
            }
        } else {
            // Tout est valide ou aucun utilisateur assigné, soumettre normalement
            onSubmit(formData);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Create New Task</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows="4"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="review">Review</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>                        </div>
                    </div>

                    <div className="form-group">
                        <label>Assign To Users</label>
                        <UserSelector
                            selectedUserIds={formData.assignedToIds}
                            onSelectionChange={handleUserSelectionChange}
                            multiple={true}
                            showValidation={true}
                            placeholder="Select users to assign this task to..."
                            className="task-user-selector"
                        />
                        
                        {showValidationWarning && validationResult && !validationResult.isValid && (
                            <div className="validation-warning">
                                <UserValidationAlert
                                    userIds={formData.assignedToIds}
                                    onValidationChange={setValidationResult}
                                    showSuggestions={true}
                                />
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Due Date</label>
                        <input
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                        />
                    </div>

                    <div className="form-group">
                        <label>Tags</label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                            placeholder="Enter tags separated by commas"
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onCancel} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            Create Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TaskDetailsModal = ({ task, onUpdate, onClose }) => {
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        progress: task.progress,
        assignedToId: task.assignedToId || '',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        tags: task.tags || ''
    });

    const handleUpdate = (e) => {
        e.preventDefault();
        onUpdate(task.id, formData);
        setEditMode(false);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content large">
                <div className="modal-header">
                    <h3>{editMode ? 'Edit Task' : task.title}</h3>
                    <div className="modal-actions">
                        {!editMode && (
                            <button onClick={() => setEditMode(true)} className="btn-secondary">
                                Edit
                            </button>
                        )}
                        <button onClick={onClose} className="btn-close">×</button>
                    </div>
                </div>

                {editMode ? (
                    <form onSubmit={handleUpdate}>
                        <div className="form-group">
                            <label>Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                rows="4"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                >
                                    <option value="todo">To Do</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="review">Review</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Priority</label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                >
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Progress (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.progress}
                                    onChange={(e) => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" onClick={() => setEditMode(false)} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary">
                                Update Task
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="task-details">
                        <div className="task-info">
                            <p><strong>Description:</strong> {task.description}</p>
                            <p><strong>Status:</strong> {task.status.replace('_', ' ')}</p>
                            <p><strong>Priority:</strong> {task.priority}</p>
                            <p><strong>Progress:</strong> {task.progress}%</p>
                            {task.assignedToName && (
                                <p><strong>Assigned to:</strong> {task.assignedToName}</p>
                            )}
                            {task.dueDate && (
                                <p><strong>Due Date:</strong> {new Date(task.dueDate).toLocaleDateString()}</p>
                            )}
                            {task.tags && (
                                <p><strong>Tags:</strong> {task.tags}</p>
                            )}
                            <p><strong>Created:</strong> {new Date(task.createdAt).toLocaleString()}</p>
                            {task.updatedAt !== task.createdAt && (
                                <p><strong>Updated:</strong> {new Date(task.updatedAt).toLocaleString()}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskManagement;
