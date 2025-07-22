import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationContext } from '../../context/NotificationContext';
import { createPortal } from 'react-dom';
import './NotificationsMenu.css';

// Composants d'icônes SVG modernes
const Icons = {
  Bell: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  ),
  Task: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74"></path>
      <path d="M5 19h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2z"></path>
    </svg>
  ),
  Message: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
  ),
  System: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  ),
  Project: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
      <polyline points="2 17 12 22 22 17"></polyline>
      <polyline points="2 12 12 17 22 12"></polyline>
    </svg>
  ),
  Comment: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
  ),
  Error: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  ),
  Success: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
  Info: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  ),
  Loading: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <line x1="12" y1="2" x2="12" y2="6"></line>
      <line x1="12" y1="18" x2="12" y2="22"></line>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
      <line x1="2" y1="12" x2="6" y2="12"></line>
      <line x1="18" y1="12" x2="22" y2="12"></line>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
    </svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  )
};

const NotificationsMenu = () => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, refreshNotifications } = useContext(NotificationContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [animateOut, setAnimateOut] = useState(false);
  const itemsPerPage = 8;
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Rafraîchir les notifications quand le menu est ouvert
  useEffect(() => {
    if (isOpen) {
      refreshNotifications();
      // Réinitialiser la pagination à chaque ouverture
      setCurrentPage(1);
    }
  }, [isOpen, refreshNotifications]);

  // Fonction pour fermer le menu avec animation
  const closeMenu = () => {
    setAnimateOut(true);
    setTimeout(() => {
      setIsOpen(false);
      setAnimateOut(false);
    }, 200);
  };

  // Fermer le menu quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeMenu();
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
    const severity = notification.severity?.toLowerCase() || '';
    
    // Priorité aux icônes basées sur la sévérité
    if (severity === 'error' || severity === 'danger') return <Icons.Error />;
    if (severity === 'success') return <Icons.Success />;
    if (severity === 'info') return <Icons.Info />;
    
    // Puis aux types
    if (type.includes('task')) return <Icons.Task />;
    if (type.includes('message')) return <Icons.Message />;
    if (type.includes('system')) return <Icons.System />;
    if (type.includes('project')) return <Icons.Project />;
    if (type.includes('comment')) return <Icons.Comment />;
    
    return <Icons.Bell />;
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
    
    // Fermer avec animation
    closeMenu();
  };

  // Marquer toutes les notifications comme lues
  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    if (isMarkingAsRead || !unreadCount) return;
    
    setIsMarkingAsRead(true);
    await markAllAsRead();
    setIsMarkingAsRead(false);
  };
  
  // Gérer le changement de page dans la pagination
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  // Grouper les notifications par date
  const groupedNotifications = useMemo(() => {
    if (!notifications || notifications.length === 0) return {};
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    return notifications.reduce((groups, notification) => {
      const date = notification.createdAt ? new Date(notification.createdAt) : new Date();
      let group;
      
      if (date >= today) {
        group = 'today';
      } else if (date >= yesterday) {
        group = 'yesterday';
      } else if (date >= lastWeek) {
        group = 'thisWeek';
      } else {
        group = 'older';
      }
      
      if (!groups[group]) groups[group] = [];
      groups[group].push(notification);
      return groups;
    }, {});
  }, [notifications]);

  // Calculer le nombre total de pages
  const totalPages = useMemo(() => {
    return Math.ceil(notifications.length / itemsPerPage);
  }, [notifications]);

  // Obtenir les notifications pour la page actuelle
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return notifications.slice(start, end);
  }, [notifications, currentPage]);

  // Fonction pour rendre le dropdown des notifications
  const renderNotificationsDropdown = () => {
    if (!isOpen) return null;
    
    return (
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
                  <Icons.Loading />
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
              <Icons.Loading />
              <p>Chargement des notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="no-notifications">
              <Icons.Check />
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
    );
  };

  // Utiliser React.createPortal pour rendre le dropdown en dehors du flux normal du DOM
  return (
    <div className="notifications-container" ref={menuRef}>
      <button 
        className="notifications-button" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Icons.Bell />
        {unreadCount > 0 && (
          <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      
      {isOpen && createPortal(
        <div className={`notifications-dropdown ${animateOut ? 'fade-out' : 'fade-in'}`} style={{ 
          position: 'fixed', 
          top: menuRef.current ? menuRef.current.getBoundingClientRect().bottom + 5 + 'px' : '65px',
          right: menuRef.current ? window.innerWidth - menuRef.current.getBoundingClientRect().right + 'px' : '20px',
          zIndex: 1180 
        }}>
          <div className="notifications-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && unreadCount > 0 && (
              <button 
                className={`mark-all-read-btn ${isMarkingAsRead ? 'disabled' : ''}`}
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAsRead}
                title="Marquer toutes les notifications comme lues"
              >
                <div className="btn-icon">
                  {isMarkingAsRead ? (
                    <Icons.Loading />
                  ) : (
                    <Icons.Check />
                  )}
                </div>
                <span>Tout marquer comme lu</span>
              </button>
            )}
          </div>
          
          <div className="notifications-list">
            {isLoading ? (
              <div className="loading-notifications">
                <Icons.Loading />
                <p>Chargement des notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">
                <Icons.Check />
                <p>Aucune notification</p>
              </div>
            ) : (
              Object.entries(groupedNotifications).map(([group, items]) => {
                let groupTitle;
                switch (group) {
                  case 'today': groupTitle = 'Aujourd\'hui'; break;
                  case 'yesterday': groupTitle = 'Hier'; break;
                  case 'thisWeek': groupTitle = 'Cette semaine'; break;
                  case 'older': groupTitle = 'Plus ancien'; break;
                  default: groupTitle = '';
                }
                
                return items.length > 0 ? (
                  <div className="notification-group" key={group}>
                    <div className="notification-date-header">{groupTitle}</div>
                    {items.map(notification => {
                      // Déterminer la classe de sévérité
                      let severityClass = '';
                      const severity = notification.severity?.toLowerCase() || '';
                      if (severity === 'error' || severity === 'danger') severityClass = 'severity-error';
                      else if (severity === 'success') severityClass = 'severity-success';
                      else if (severity === 'info') severityClass = 'severity-info';
                      
                      return (
                        <div 
                          key={notification.id} 
                          className={`notification-item ${notification.isRead ? '' : 'unread'} ${severityClass}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="notification-icon">
                            {getNotificationIcon(notification)}
                          </div>
                          <div className="notification-content">
                            {severity && (
                              <div className={`notification-category-badge badge-${severity === 'error' || severity === 'danger' ? 'error' : (severity === 'success' ? 'success' : 'info')}`}>
                                {severity === 'error' || severity === 'danger' ? '⚠️ Erreur' : 
                                 severity === 'success' ? '✅ Succès' : 'ℹ️ Info'}
                              </div>
                            )}
                            <p className="notification-title">{notification.title || 'Notification'}</p>
                            <p className="notification-message">{notification.message}</p>
                            <span className="notification-time">{formatDate(notification.createdAt)}</span>
                          </div>
                          {!notification.isRead && <div className="unread-indicator"></div>}
                        </div>
                      );
                    })}
                  </div>
                ) : null;
              })
            )}
          </div>
          
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button 
                className="pagination-btn" 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Page précédente"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              
              <span className="pagination-info">{currentPage}/{totalPages}</span>
              
              <button 
                className="pagination-btn" 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Page suivante"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          )}
          
          {notifications.length > 5 && (
            <div className="notifications-footer">
              <button className="view-all-btn" onClick={() => navigate('/notifications')}>
                <span>Voir toutes les notifications</span>
                <Icons.ChevronRight />
              </button>
            </div>
          )}
        </div>,
        document.body,
        'notifications-portal'
      )}
    </div>
  );
};

export default NotificationsMenu;
