import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import NotificationService, { notificationService } from '../services/notificationService';
import api from '../config/api.config';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, userData } = useContext(AuthContext);
  
  // Expose context for testing
  useEffect(() => { 
    window.__NOTIFICATION_CONTEXT__ = { notifications, unreadCount, isConnected }; 
  }, [notifications, unreadCount, isConnected]);

  // Initialiser la connexion au hub de notifications
  useEffect(() => {
    let mounted = true;
    const initNotifications = async () => {
      if (isAuthenticated && userData?.id) {
        try {
          console.log('Initializing notification connection for user:', userData.id);
          const connected = await notificationService.startConnection();
          
          if (mounted) {
            setIsConnected(connected);
            
            if (connected) {
              // S'abonner aux notifications
              notificationService.onTaskNotification(handleNewNotification);
              
              // Récupérer les notifications existantes
              await fetchNotifications();
            }
          }
        } catch (error) {
          console.error('Failed to initialize notifications:', error);
        }
      } else if (!isAuthenticated && isConnected) {
        // Déconnecter si l'utilisateur se déconnecte
        await notificationService.stopConnection();
        setIsConnected(false);
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    initNotifications();

    return () => {
      mounted = false;
      // Nettoyage à la destruction du composant
      notificationService.stopConnection();
    };
  }, [isAuthenticated, userData?.id]);

  // Gérer l'arrivée d'une nouvelle notification
  const handleNewNotification = (notification) => {
    console.log('New notification received:', notification);
    
    // Ajouter la notification à la liste
    setNotifications(prev => [notification, ...prev]);
    
    // Incrémenter le compteur de non-lus
    setUnreadCount(prev => prev + 1);
    
    // Afficher une notification système si pris en charge
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title || 'Nouvelle notification', {
          body: notification.message || 'Vous avez reçu une nouvelle notification',
          icon: '/favicon.ico'
        });
      } catch (error) {
        console.warn('Failed to display system notification:', error);
      }
    }
  };

  // Récupérer les notifications existantes
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/notifications');
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`Loaded ${response.data.length} notifications from server`);
        setNotifications(response.data);
        setUnreadCount(response.data.filter(n => !n.isRead).length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Marquer une notification comme lue
  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  };

  // Marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
      
      return true;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return false;
    }
  };

  // Fonction pour rafraîchir les notifications - utilisée par NotificationsMenu
  const refreshNotifications = useCallback(async () => {
    if (isAuthenticated && userData?.id) {
      await fetchNotifications();
    }
  }, [isAuthenticated, userData?.id]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        isLoading,
        markAsRead,
        markAllAsRead,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
