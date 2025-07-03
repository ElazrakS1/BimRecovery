import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TaskNotification.module.css';

/**
 * Composant pour afficher une notification de tâche
 * @param {Object} notification - Objet de notification contenant id, message, timestamp, taskId
 * @param {Function} onClose - Fonction à appeler quand la notification est fermée
 */
const TaskNotification = ({ notification, onClose }) => {
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  // Formater le message de la notification
  const getNotificationTitle = () => {
    if (notification.title) {
      return 'Nouvelle tâche assignée';
    }
    if (notification.type === 'task_update') {
      return 'Mise à jour de tâche';
    }
    return 'Notification';
  };

  // Formater le message
  const getNotificationMessage = () => {
    if (notification.message) {
      return notification.message;
    }
    if (notification.title) {
      return `Une tâche vous a été assignée: "${notification.title}"`;
    }
    return 'Vous avez une nouvelle notification';
  };

  // Obtenir l'ID de la tâche, quelle que soit la structure de la notification
  const getTaskId = () => {
    if (notification.taskId) {
      return notification.taskId;
    }
    if (notification.id && typeof notification.id === 'number') {
      return notification.id;
    }
    return null;
  };

  useEffect(() => {
    // Auto-fermeture de la notification après 8 secondes
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        onClose && onClose(notification.id);
      }, 300); // Attendre que l'animation de sortie se termine
    }, 8000);

    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  const handleClick = () => {
    const taskId = getTaskId();
    if (taskId) {
      navigate(`/tasks?highlight=${taskId}`);
    }
    onClose && onClose(notification.id);
  };
  
  return (
    <div 
      className={`${styles.taskNotification} ${visible ? styles.show : styles.hide}`} 
      onClick={handleClick}
    >
      <div className={styles.taskNotificationContent}>
        <div className={styles.taskNotificationIcon}>
          <i className="fas fa-bell"></i>
        </div>
        <div className={styles.taskNotificationText}>
          <h4>{getNotificationTitle()}</h4>
          <p>{getNotificationMessage()}</p>
          <small>{new Date(notification.timestamp).toLocaleTimeString()}</small>
        </div>
      </div>
      <button 
        className={styles.taskNotificationClose} 
        onClick={(e) => {
          e.stopPropagation();
          setVisible(false);
          setTimeout(() => onClose && onClose(notification.id), 300);
        }}
        aria-label="Fermer la notification"
      >
        &times;
      </button>
    </div>
  );
};

export default TaskNotification;
