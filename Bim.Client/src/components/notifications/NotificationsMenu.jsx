import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationContext } from '../../context/NotificationContext';
import './NotificationsMenu.css';

const NotificationsMenu = () => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, refreshNotifications } = useContext(NotificationContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Rafraîchir les notifications quand le menu est ouvert
  useEffect(() => {
    if (isOpen) {
      refreshNotifications();
    }
  }, [isOpen, refreshNotifications]);

  // Fermer le menu quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formater la date pour l'affichage
  const formatDate = (dateString) => {
    if (!dateString) return 'À l\'instant';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'À l\'instant';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'À l\'instant';
    } else if (diffMins < 60) {
      return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }
  };

  // Déterminer l'icône à afficher selon le type de notification
  const getNotificationIcon = (notification) => {
    const type = notification.type?.toLowerCase() || '';
    
    if (type.includes('task')) return <i className="fas fa-tasks"></i>;
    if (type.includes('message')) return <i className="fas fa-envelope"></i>;
    if (type.includes('system')) return <i className="fas fa-cog"></i>;
    if (type.includes('project')) return <i className="fas fa-project-diagram"></i>;
    if (type.includes('comment')) return <i className="fas fa-comment"></i>;
    
    return <i className="fas fa-bell"></i>;
  };

  // Ouvrir le détail d'une notification et la marquer comme lue
  const handleNotificationClick = async (notification) => {
    // Marquer comme lue si elle ne l'est pas déjà
    if (!notification.isRead) {
      setIsMarkingAsRead(true);
      await markAsRead(notification.id);
      setIsMarkingAsRead(false);
    }
    
    // Navigation selon le type de notification
    if (notification.data) {
      try {
        const data = typeof notification.data === 'string' 
          ? JSON.parse(notification.data) 
          : notification.data;
          
        if (data.taskId) {
          navigate(`/tasks?id=${data.taskId}`);
        } else if (data.projectId) {
          navigate(`/projects/${data.projectId}`);
        } else if (data.url) {
          navigate(data.url);
        }
      } catch (err) {
        console.warn('Failed to parse notification data:', err);
      }
    }
    
    setIsOpen(false);
  };

  // Marquer toutes les notifications comme lues
  const handleMarkAllAsRead = async () => {
    if (isMarkingAsRead || !unreadCount) return;
    
    setIsMarkingAsRead(true);
    await markAllAsRead();
    setIsMarkingAsRead(false);
  };

  return (
    <div className="notifications-container" ref={menuRef}>
      <button 
        className="notifications-button" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      
      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && unreadCount > 0 && (
              <button 
                className={`mark-all-read-btn ${isMarkingAsRead ? 'disabled' : ''}`}
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAsRead}
              >
                {isMarkingAsRead ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Traitement...
                  </>
                ) : (
                  'Tout marquer comme lu'
                )}
              </button>
            )}
          </div>
          
          <div className="notifications-list">
            {isLoading ? (
              <div className="loading-notifications">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Chargement des notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">
                <i className="fas fa-check-circle"></i>
                <p>Aucune notification</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${notification.isRead ? '' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification)}
                  </div>
                  <div className="notification-content">
                    <p className="notification-title">{notification.title || 'Notification'}</p>
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">{formatDate(notification.createdAt)}</span>
                  </div>
                  {!notification.isRead && <div className="unread-indicator"></div>}
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 5 && (
            <div className="notifications-footer">
              <button className="view-all-btn" onClick={() => navigate('/notifications')}>
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsMenu;
