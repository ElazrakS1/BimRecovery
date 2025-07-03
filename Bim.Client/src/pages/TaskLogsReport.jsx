import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api.config';
import { format, parseISO, endOfDay, startOfDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AuthContext } from '../context/AuthContext';
import styles from './TaskLogsReport.module.css';

const TaskLogsReport = () => {
  const { isAuthenticated, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Rediriger si non authentifié ou non admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
  }, [isAuthenticated, isAdmin, navigate]);
  
  useEffect(() => {    const fetchLogs = async () => {
      // Ne pas exécuter si non authentifié ou non admin
      if (!isAuthenticated || !isAdmin) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
          // Configuration des dates
        const now = new Date();
        const endDateValue = format(endOfDay(now), "yyyy-MM-dd'T'HH:mm:ss'Z'");
        const startDateValue = format(startOfDay(subDays(now, 7)), "yyyy-MM-dd'T'HH:mm:ss'Z'");
        
        // Store dates in state for display
        setStartDate(startDateValue);
        setEndDate(endDateValue);
          // Paramètres de requête
        const queryParams = new URLSearchParams({
          startDate: startDateValue,
          endDate: endDateValue,
          resource: 'tasks',
          pageSize: 100
        });

        const response = await api.get(`/api/Logs?${queryParams}`);

        if (!response.data) {
          throw new Error('No data received from server');
        }

        // Filtrer uniquement les actions pertinentes pour les tâches
        const taskLogs = response.data.data.filter(log => 
          log.resource.toLowerCase() === 'tasks' &&
          ['create', 'update', 'delete', 'complete'].includes(log.action.toLowerCase())
        );

        setLogs(taskLogs.map(log => ({
          ...log,
          timestamp: parseISO(log.timestamp)
        })));

      } catch (err) {
        console.error('Error fetching logs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }    };    fetchLogs();
  }, [isAuthenticated, isAdmin]); // Dependencies are correct - both are from context
  if (loading) {
    return <div className={styles.loading}>Chargement des logs...</div>;
  }

  if (error) {
    return <div className={styles.error}>Erreur: {error}</div>;
  }

  // Regrouper les logs par action
  const logsByAction = logs.reduce((acc, log) => {
    const action = log.action.toLowerCase();
    if (!acc[action]) {
      acc[action] = [];
    }
    acc[action].push(log);
    return acc;
  }, {});
  return (
    <div className={styles.reportContainer}>
      <h1 className={styles.title}>
        Rapport d'activité des tâches ({format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')})
      </h1>
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Résumé des actions</h2>
        <ul className={styles.actionList}>
          {Object.entries(logsByAction).map(([action, actionLogs]) => (
            <li key={action} className={styles.actionItem}>
              <h3 className={styles.actionHeader}>
                {action.charAt(0).toUpperCase() + action.slice(1)}
                <span className={styles.actionCount}>{actionLogs.length}</span>
              </h3>
              <ul className={styles.logsList}>
                {actionLogs.map(log => (
                  <li key={log.id} className={styles.logItem}>
                    <span className={styles.timestamp}>
                      {format(log.timestamp, 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </span>
                    {log.details}
                    {log.userName && (
                      <span className={styles.userName}> (par {log.userName})</span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TaskLogsReport;
