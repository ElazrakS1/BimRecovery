import React, { useState, useEffect } from 'react';
import { useCollaboration } from '../Collaboration/CollaborationProvider';
import api from '../../config/api.config';
import './NotificationCenter.css';

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [preferences, setPreferences] = useState(null);
    const [showPreferences, setShowPreferences] = useState(false);
    
    const { connection } = useCollaboration();

    useEffect(() => {
        if (connection) {
            // Listen for real-time notifications
            connection.on('ReceiveNotification', (notification) => {
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
                
                // Show browser notification if enabled
                if (Notification.permission === 'granted') {
                    new Notification(notification.title, {
                        body: notification.message,
                        icon: '/favicon.ico'
                    });
                }
            });

            connection.on('NotificationMarkedAsRead', (notificationId) => {
                setNotifications(prev => 
                    prev.map(n => 
                        n.id === notificationId ? { ...n, isRead: true } : n
                    )
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            });

            connection.on('AllNotificationsMarkedAsRead', () => {
                setNotifications(prev => 
                    prev.map(n => ({ ...n, isRead: true }))
                );
                setUnreadCount(0);
            });
        }

        return () => {
            if (connection) {
                connection.off('ReceiveNotification');
                connection.off('NotificationMarkedAsRead');
                connection.off('AllNotificationsMarkedAsRead');
            }
        };
    }, [connection]);

    useEffect(() => {
        fetchNotifications();
        fetchPreferences();
        requestNotificationPermission();
    }, []);

    const requestNotificationPermission = async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    };    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/notifications');
            setNotifications(response.data);
            setUnreadCount(response.data.filter(n => !n.isRead).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };    const fetchPreferences = async () => {
        try {
            const response = await api.get('/api/notifications/preferences');
            setPreferences(response.data);
        } catch (error) {
            console.error('Error fetching preferences:', error);
        }
    };    const markAsRead = async (notificationId) => {
        try {
            await api.put(`/api/notifications/${notificationId}/read`);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };    const markAllAsRead = async () => {
        try {
            await api.put('/api/notifications/read-all');
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };    const updatePreferences = async (newPreferences) => {
        try {
            await api.put('/api/notifications/preferences', newPreferences);
            setPreferences(newPreferences);
            setShowPreferences(false);
        } catch (error) {
            console.error('Error updating preferences:', error);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'task_assigned': return '📋';
            case 'task_updated': return '✏️';
            case 'task_completed': return '✅';
            case 'annotation_added': return '💬';
            case 'annotation_replied': return '↩️';
            case 'project_updated': return '🏗️';
            default: return '🔔';
        }
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    return (
        <div className="notification-center">
            <button 
                className="notification-bell"
                onClick={() => setIsOpen(!isOpen)}
            >
                🔔
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        <div className="notification-actions">
                            <button 
                                onClick={() => setShowPreferences(true)}
                                className="btn-icon"
                                title="Settings"
                            >
                                ⚙️
                            </button>
                            {unreadCount > 0 && (
                                <button 
                                    onClick={markAllAsRead}
                                    className="btn-text"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="notification-list">
                        {loading ? (
                            <div className="notification-loading">
                                <div className="spinner"></div>
                                <p>Loading notifications...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="notification-empty">
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div 
                                    key={notification.id}
                                    className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                                    onClick={() => {
                                        if (!notification.isRead) {
                                            markAsRead(notification.id);
                                        }
                                    }}
                                >
                                    <div className="notification-icon">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="notification-content">
                                        <h4>{notification.title}</h4>
                                        <p>{notification.message}</p>
                                        <span className="notification-time">
                                            {formatTimeAgo(notification.createdAt)}
                                        </span>
                                    </div>
                                    {!notification.isRead && (
                                        <div className="notification-unread-dot"></div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {showPreferences && preferences && (
                <NotificationPreferences
                    preferences={preferences}
                    onSave={updatePreferences}
                    onClose={() => setShowPreferences(false)}
                />
            )}
        </div>
    );
};

const NotificationPreferences = ({ preferences, onSave, onClose }) => {
    const [formData, setFormData] = useState(preferences);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Notification Preferences</h3>
                    <button onClick={onClose} className="btn-close">×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="preferences-section">
                        <h4>Delivery Methods</h4>
                        <div className="checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={formData.emailEnabled}
                                    onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        emailEnabled: e.target.checked 
                                    }))}
                                />
                                Email notifications
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={formData.browserEnabled}
                                    onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        browserEnabled: e.target.checked 
                                    }))}
                                />
                                Browser notifications
                            </label>
                        </div>
                    </div>

                    <div className="preferences-section">
                        <h4>Notification Types</h4>
                        <div className="checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={formData.taskAssignments}
                                    onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        taskAssignments: e.target.checked 
                                    }))}
                                />
                                Task assignments and updates
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={formData.annotations}
                                    onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        annotations: e.target.checked 
                                    }))}
                                />
                                Annotations and comments
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={formData.projectUpdates}
                                    onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        projectUpdates: e.target.checked 
                                    }))}
                                />
                                Project updates
                            </label>
                        </div>
                    </div>

                    <div className="preferences-section">
                        <h4>Email Frequency</h4>
                        <select
                            value={formData.emailFrequency}
                            onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                emailFrequency: e.target.value 
                            }))}
                        >
                            <option value="immediate">Immediate</option>
                            <option value="hourly">Hourly digest</option>
                            <option value="daily">Daily digest</option>
                            <option value="weekly">Weekly digest</option>
                        </select>
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            Save Preferences
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NotificationCenter;
