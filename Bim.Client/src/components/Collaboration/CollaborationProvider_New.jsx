import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../config/api.config';

// Create the collaboration context
const CollaborationContext = createContext();

// Hook to use collaboration context
export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};

const CollaborationProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const pollingInterval = useRef(null);

  useEffect(() => {
    // Initialize simple polling for updates (will be replaced with SignalR later)
    setIsConnected(true);
    
    // Poll for updates every 10 seconds
    pollingInterval.current = setInterval(() => {
      fetchNotifications();
    }, 10000);

    // Initial fetch
    fetchNotifications();

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      setIsConnected(false);
    };
  }, []);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Create a new annotation
  const createAnnotation = async (annotationData) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${API_BASE_URL}/api/annotations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(annotationData)
      });

      if (response.ok) {
        const newAnnotation = await response.json();
        setAnnotations(prev => [...prev, newAnnotation]);
        toast.success('Annotation créée avec succès');
        return newAnnotation;
      } else {
        throw new Error('Erreur lors de la création de l\'annotation');
      }
    } catch (error) {
      console.error('Error creating annotation:', error);
      toast.error('Erreur lors de la création de l\'annotation');
      throw error;
    }
  };

  // Create a new task
  const createTask = async (taskData) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${API_BASE_URL}/api/collaborationtasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });

      if (response.ok) {
        const newTask = await response.json();
        setTasks(prev => [...prev, newTask]);
        toast.success('Tâche créée avec succès');
        return newTask;
      } else {
        throw new Error('Erreur lors de la création de la tâche');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Erreur lors de la création de la tâche');
      throw error;
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, isRead: true } : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Get unread notifications count
  const getUnreadCount = () => {
    return notifications.filter(notif => !notif.isRead).length;
  };

  const value = {
    isConnected,
    notifications,
    annotations,
    tasks,
    createAnnotation,
    createTask,
    markNotificationAsRead,
    getUnreadCount,
    refreshData: fetchNotifications
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

export default CollaborationProvider;
