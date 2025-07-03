import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfDay, endOfDay, parseISO, subDays, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import styles from './Logs.module.css';
import api from '../../config/api.config';

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    totalPages: 1,
    totalCount: 0
  });

  // Initialize with current date and previous week
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const sevenDaysAgo = format(subDays(now, 7), 'yyyy-MM-dd');
  
  const [filters, setFilters] = useState({
    startDate: sevenDaysAgo,
    endDate: today,
    action: '',
    resource: '',
    level: ''
  });

  const validateDateRange = (start, end) => {
    // Vérifier si les dates sont valides
    if (!isValid(start) || !isValid(end)) {
      throw new Error('Les dates sélectionnées ne sont pas valides');
    }

    // Vérifier que la date de début est avant la date de fin
    if (start > end) {
      throw new Error('La date de début doit être antérieure à la date de fin');
    }

    // Vérifier que les dates ne sont pas dans le futur
    // Utiliser la fin de la journée en cours comme référence
    const today = endOfDay(new Date());
    if (startOfDay(start) > today || endOfDay(end) > today) {
      throw new Error('Les dates ne peuvent pas être dans le futur');
    }

    // Vérifier la limite de 90 jours
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      throw new Error('La plage de dates ne peut pas dépasser 90 jours');
    }

    return true;
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Utiliser startOfDay et endOfDay pour avoir des dates complètes
      const startDateLocal = startOfDay(parseISO(filters.startDate));
      const endDateLocal = endOfDay(parseISO(filters.endDate));

      // Valider la plage de dates
      validateDateRange(startDateLocal, endDateLocal);      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('startDate', format(startDateLocal, "yyyy-MM-dd'T'HH:mm:ss'Z'"));
      queryParams.append('endDate', format(endDateLocal, "yyyy-MM-dd'T'HH:mm:ss'Z'"));
      queryParams.append('page', pagination.page.toString());
      queryParams.append('pageSize', pagination.pageSize.toString());

      if (filters.action) queryParams.append('action', filters.action);
      if (filters.resource) queryParams.append('resource', filters.resource);
      if (filters.level) queryParams.append('level', filters.level);

      // Add request tracking ID
      const requestId = Math.random().toString(36).substring(7);
      queryParams.append('requestId', requestId);

      console.log('Fetching logs with params:', Object.fromEntries(queryParams.entries()));

      const response = await api.get(`/api/Logs?${queryParams}`, {
        timeout: 60000,
        headers: {
          'X-Request-ID': requestId
        }
      });

      if (!response.data) {
        throw new Error('Pas de données reçues du serveur');
      }

      const { data, pagination: paginationData } = response.data;

      if (!Array.isArray(data)) {
        throw new Error('Format de réponse invalide: tableau attendu');
      }

      setLogs(data.map(log => ({
        ...log,
        timestamp: parseISO(log.timestamp)
      })));

      setPagination(prev => ({
        ...prev,
        totalCount: paginationData?.totalCount || 0,
        totalPages: paginationData?.totalPages || 1
      }));

    } catch (err) {
      console.error('Error fetching logs:', err);
      let errorMessage = 'Échec de la récupération des logs';

      if (err.response?.data) {
        const responseData = err.response.data;
        errorMessage = responseData.message;

        if (responseData.requestId) {
          errorMessage += ` (ID de requête: ${responseData.requestId})`;
        }

        switch (responseData.code) {
          case 'FUTURE_DATE':
          case 'INVALID_DATE_RANGE':
          case 'DATE_RANGE_TOO_LARGE':
          case 'MISSING_DATES':
          case 'INVALID_DATE_FORMAT':
            break; // Use server message directly
          case 'QUERY_TIMEOUT':
            errorMessage = 'La requête a pris trop de temps. Veuillez réduire la plage de dates ou affiner vos filtres.';
            break;
          case 'QUERY_ERROR':
            errorMessage = 'Une erreur s\'est produite lors de la récupération des logs. Veuillez réessayer avec une plage de dates plus courte.';
            break;          case 'UNEXPECTED_ERROR':
            errorMessage = 'Une erreur inattendue s\'est produite. Veuillez réessayer ultérieurement.';
            break;
          default:            if (err.response?.status === 500) {
              errorMessage = `Une erreur est survenue sur le serveur. Détails: ${responseData.details || 'Non spécifié'}`;
              console.error('Server error details:', {
                message: responseData.message,
                details: responseData.details,
                requestId: responseData.requestId,
                code: responseData.code
              });
              break;
            }
            if (responseData.details) {
              if (typeof responseData.details === 'string') {
                errorMessage += `\n${responseData.details}`;
              } else {
                const { currentDate, providedDate, maxDays, requestedDays } = responseData.details;
                if (currentDate && providedDate) {
                  errorMessage += `\nDate actuelle: ${format(parseISO(currentDate), 'dd/MM/yyyy')}, Date fournie: ${format(parseISO(providedDate), 'dd/MM/yyyy')}`;
                }
                if (maxDays && requestedDays) {
                  errorMessage += `\nJours maximum: ${maxDays}, Jours demandés: ${requestedDays}`;
                }
              }
            }
        }
      } else if (err.request) {
        errorMessage = 'Erreur réseau. Veuillez vérifier votre connexion.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.pageSize]);
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, filters, pagination.page, pagination.pageSize]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    setError(null);
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleExport = async () => {
    try {
      setError(null);
      const startDate = parseISO(filters.startDate);
      const endDate = parseISO(filters.endDate);

      if (!isValid(startDate) || !isValid(endDate)) {
        throw new Error('Dates invalides sélectionnées pour l\'export');
      }

      const queryParams = new URLSearchParams();
      queryParams.append('startDate', format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ss'Z'"));
      queryParams.append('endDate', format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ss'Z'"));
      
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.resource) queryParams.append('resource', filters.resource);
      if (filters.level) queryParams.append('level', filters.level);

      const response = await api.get(`/api/Logs/export?${queryParams.toString()}`, {
        responseType: 'blob'
      });

      if (!response.data) {
        throw new Error('Pas de données reçues du serveur');
      }

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system_logs_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting logs:', err);
      let errorMessage = 'Échec de l\'export des logs';
      
      if (err.response) {
        switch (err.response.status) {
          case 400:
            errorMessage = err.response.data.message || 'Paramètres invalides';
            break;
          case 408:
            errorMessage = 'Délai d\'attente dépassé. Veuillez réduire la plage de dates.';
            break;
          case 500:
            errorMessage = err.response.data.message || 'Erreur serveur lors de l\'export des logs';
            break;
          default:
            errorMessage = err.response.data.message || err.message;
        }
      }
      
      setError(errorMessage);
    }
  };

  return (
    <div className={styles.logsContainer}>
      <div className={styles.header}>
        <h1>Logs Système</h1>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Date de début:</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={handleFilterChange}
              className={styles.dateInput}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Date de fin:</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              min={filters.startDate || undefined}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={handleFilterChange}
              className={styles.dateInput}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Action:</label>
            <select
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              className={styles.select}
            >
              <option value="">Tous</option>
              <option value="view">Consultation</option>
              <option value="create">Création</option>
              <option value="update">Modification</option>
              <option value="delete">Suppression</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Ressource:</label>
            <select
              name="resource"
              value={filters.resource}
              onChange={handleFilterChange}
              className={styles.select}
            >
              <option value="">Tous</option>
              <option value="users">Utilisateurs</option>
              <option value="projects">Projets</option>
              <option value="tasks">Tâches</option>
              <option value="settings">Paramètres</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Niveau:</label>
            <select
              name="level"
              value={filters.level}
              onChange={handleFilterChange}
              className={styles.select}
            >
              <option value="">Tous</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          <button onClick={handleExport} className={styles.exportButton}>
            Exporter CSV
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Chargement...</div>
      ) : (
        <>
          <table className={styles.logsTable}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
                <th>Level</th>
                <th>IP Address</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className={styles[log.level.toLowerCase()]}>
                  <td>{format(log.timestamp, 'dd/MM/yyyy HH:mm:ss', { locale: fr })}</td>
                  <td>{log.action}</td>
                  <td>{log.resource}</td>
                  <td>{log.details}</td>
                  <td>{log.level}</td>
                  <td>{log.ipAddress}</td>
                  <td>{log.userName}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.pagination}>
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Précédent
            </button>
            <span>
              Page {pagination.page} sur {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Suivant
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LogsPage;
