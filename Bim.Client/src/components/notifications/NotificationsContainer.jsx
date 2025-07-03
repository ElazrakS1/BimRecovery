import React, { useState, useEffect } from 'react';
import TaskNotification from './TaskNotification';
import styles from './NotificationContainer.module.css';

const NotificationsContainer = ({ notifications, onNotificationClose }) => {
  const [visibleNotifications, setVisibleNotifications] = useState([]);
  
  useEffect(() => {
    // Ajouter les nouvelles notifications
    if (notifications && notifications.length > 0) {
      setVisibleNotifications(prev => {
        // Filtrer pour ne garder que les nouvelles notifications non lues et non déjà affichées
        const newNotifications = notifications
          .filter(notification => !notification.read)  // Ne montrer que les notifications non lues
          .filter(
            newNotif => !prev.some(existingNotif => existingNotif.id === newNotif.id)
          );
        
        // Combiner les nouvelles et existantes, mais limiter à 5 notifications max
        return [...prev, ...newNotifications].slice(-5);
      });
    }
  }, [notifications]);
  
  const handleClose = (id) => {
    setVisibleNotifications(prev => prev.filter(notification => notification.id !== id));
    if (onNotificationClose) {
      onNotificationClose(id);
    }
  };
  
  // Ne rien afficher s'il n'y a pas de notifications
  if (visibleNotifications.length === 0) {
    return null;
  }
    
  return (
    <div className={styles.notificationsContainer}>
      {visibleNotifications.map((notification) => (
        <TaskNotification 
          key={notification.id}
          notification={notification}
          onClose={handleClose}
        />
      ))}
    </div>
  );
};

export default NotificationsContainer;
