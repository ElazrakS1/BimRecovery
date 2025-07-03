import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import styles from './TasksNew.module.css';

const Tasks = () => {
  const { texts } = useContext(LanguageContext);
  const { isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) {
    return (
      <div className={styles.messageContainer}>
        <p>Please log in to view tasks.</p>
      </div>
    );
  }

  return (
    <div className={styles.tasksWrapper}>
      <div className={styles.header}>
        <h1>{texts.tasks || 'Tasks'}</h1>
      </div>
      <div className={styles.content}>
        <p>Task management interface - Coming soon!</p>
      </div>
    </div>
  );
};

export default Tasks;
