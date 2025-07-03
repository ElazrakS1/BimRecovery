import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import toast from 'react-hot-toast';
import api from '../../config/api.config';
import { AuthContext } from '../../context/AuthContext';

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

  // Import du contexte d'authentification
  const { isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    // Ne pas démarrer le polling si l'utilisateur n'est pas authentifié
    if (!isAuthenticated) {
      return;
    }
    
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
  }, [isAuthenticated]); // Réagir aux changements d'état d'authentification
  
  // Fetch notifications from API
  const fetchNotifications = async () => {
    // Ne pas tenter de récupérer des notifications si non authentifié
    if (!isAuthenticated) {
      return;
    }
    
    try {
      const response = await api.get('/api/notifications');
      setNotifications(response.data);
    } catch (error) {
      // Log uniquement si ce n'est pas une erreur 401 (non authentifié)
      if (error.response?.status !== 401) {
        console.error('Error fetching notifications:', error);
      }
    }
  };
  // Create a new annotation
  const createAnnotation = async (annotationData) => {
    try {
      const response = await api.post('/api/annotations', annotationData);
      setAnnotations(prev => [...prev, response.data]);
      toast.success('Annotation créée avec succès');
      return response.data;
    } catch (error) {
      console.error('Error creating annotation:', error);
      toast.error('Erreur lors de la création de l\'annotation');
      throw error;
    }
  };
  // Create a new task
  const createTask = async (taskData) => {
    try {
      const response = await api.post('/api/collaborationtasks', taskData);
      setTasks(prev => [...prev, response.data]);
      toast.success('Tâche créée avec succès');
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Erreur lors de la création de la tâche');
      throw error;
    }
  };
  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await api.post(`/api/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
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
