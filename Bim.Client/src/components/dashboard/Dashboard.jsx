import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../../services/projectService';
import { NotificationContext } from '../../context/NotificationContext';
import './Dashboard.css';
import './EmptyState.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalFiles: 0,
    recentActivity: 0
  });
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [hoveredProject, setHoveredProject] = useState(null);
  const navigate = useNavigate();
  const { notifications } = useContext(NotificationContext);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const projectsData = await getProjects();
        setProjects(projectsData);
        
        // Calculate stats
        const activeProjects = projectsData.filter(p => p.status === 'Actif').length;
        const totalFiles = projectsData.reduce((acc, p) => acc + ((p.files?.length || 0) + (p.ifcFiles?.length || 0)), 0);
        const recentActivities = projectsData.filter(p => {
          const lastModified = new Date(p.lastModifiedDate);
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return lastModified > oneWeekAgo;
        }).length;

        setStats({
          totalProjects: projectsData.length,
          activeProjects,
          totalFiles,
          recentActivity: recentActivities
        });

        const recentActivitiesList = projectsData
          .sort((a, b) => new Date(b.lastModifiedDate) - new Date(a.lastModifiedDate))
          .slice(0, 5)
          .map(project => ({
            id: project.id,
            projectName: project.name,
            date: new Date(project.lastModifiedDate),
            type: project.status === 'En cours' ? 'update' : 'create',
            description: `Mise à jour du projet "${project.name}"`
          }));        setActivities(recentActivitiesList);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      }
    };

    fetchDashboardData();
  }, []);

  const handleCreateProject = () => {
    navigate('/projects/');
  };

  const handleViewProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };
  const handleShareProject = (e, project) => {
    e.stopPropagation();
    setSelectedProject(project);
    setShowShareModal(true);
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setSelectedProject(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non défini';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Non défini';
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  // Gérer les clics sur les notifications dans le tableau de bord
  const handleNotificationClick = (notification) => {
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
  };

  // Obtenir les 5 dernières notifications pour le tableau de bord
  const recentNotifications = notifications
    .slice(0, 5)
    .map(notification => ({
      ...notification,
      formattedDate: formatDate(notification.createdAt)
    }));

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Tableau de Bord BIM</h1>
          <p>Gérez vos projets BIM et suivez leur progression en temps réel.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-building"></i>
            </div>
            <div className="stat-info">
              <h3>Projets Actifs</h3>
              <div className="stat-value">{stats.activeProjects}</div>
              <div className="stat-trend">
                <i className="fas fa-clock"></i>
                <span>En cours</span>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="stat-info">
              <h3>Activités Récentes</h3>
              <div className="stat-value">{stats.recentActivity}</div>
              <div className="stat-trend">
                <i className="fas fa-calendar-check"></i>
                <span>Cette semaine</span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-file-alt"></i>
            </div>
            <div className="stat-info">
              <h3>Fichiers IFC</h3>
              <div className="stat-value">{stats.totalFiles}</div>
              <div className="stat-trend">
                <i className="fas fa-database"></i>
                <span>Modèles BIM</span>
              </div>
            </div>
          </div>
        </div>        {/* Projets Actifs */}
        <section className="recent-projects">
          <div className="section-header">
            <h2>Projets Actifs</h2>
            <button 
              className="action-button"
              onClick={handleCreateProject}
            >
              <i className="fas fa-plus"></i>
              <span>Nouveau Projet</span>
            </button>
          </div>
          
          <div className="project-grid">            {projects
              .filter(project => project.status === 'Actif')
              .map((project) => (
                <div 
                  key={project.id} 
                  className="project-card"
                  onMouseEnter={() => setHoveredProject(project.id)}
                  onMouseLeave={() => setHoveredProject(null)}
                >
                  <div className="project-thumbnail">
                    <div className="project-thumbnail-placeholder">
                      <i className="fas fa-building-user"></i>
                    </div>
                    <div className={`project-status-badge status-${project.status?.toLowerCase() || 'en-attente'}`}>
                      {project.status || 'En attente'}
                    </div>
                    {hoveredProject === project.id && (
                      <div className="project-actions">
                        <button 
                          className="action-button"
                          onClick={() => handleViewProject(project.id)}
                          title="Voir les détails"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button 
                          className="action-button"
                          onClick={(e) => handleShareProject(e, project)}
                          title="Partager le projet"
                        >
                          <i className="fas fa-share-alt"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="project-info">
                    <h3 className="project-title">{project.name || 'Sans titre'}</h3>
                    <div className="project-details">
                      <div className="detail-item">
                        <div className="detail-icon">
                          <i className="fas fa-calendar"></i>
                        </div>
                        <div className="detail-text">
                          <span className="detail-label">Dernière mise à jour</span>
                          <span className="detail-value">{formatDate(project.lastModifiedDate)}</span>
                        </div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-icon">
                          <i className="fas fa-file"></i>
                        </div>
                        <div className="detail-text">
                          <span className="detail-label">Fichiers</span>
                          <span className="detail-value">{project.ifcFiles?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            ))}
            {!projects.some(project => project.status === 'Actif') && (
              <div className="empty-state">
                <p>Aucun projet actif pour le moment. Activez un projet en attente pour le voir apparaître ici.</p>
              </div>
            )}
          </div>
        </section>
        
        {/* Projets en Attente */}
        <section className="recent-projects">
          <div className="section-header">
            <h2>Projets en Attente</h2>
          </div>
          
          <div className="project-grid">            {projects
              .filter(project => project.status !== 'Actif')
              .map((project) => (
                <div 
                  key={project.id} 
                  className="project-card"
                  onMouseEnter={() => setHoveredProject(project.id)}
                  onMouseLeave={() => setHoveredProject(null)}
                >
                  <div className="project-thumbnail">
                    <div className="project-thumbnail-placeholder">
                      <i className="fas fa-building-user"></i>
                    </div>
                    <div className={`project-status-badge status-${project.status?.toLowerCase() || 'en-attente'}`}>
                      {project.status || 'En attente'}
                    </div>
                    {hoveredProject === project.id && (
                      <div className="project-actions">
                        <button 
                          className="action-button"
                          onClick={() => handleViewProject(project.id)}
                          title="Voir les détails"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button 
                          className="action-button"
                          onClick={(e) => handleShareProject(e, project)}
                          title="Partager le projet"
                        >
                          <i className="fas fa-share-alt"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="project-info">
                    <h3 className="project-title">{project.name || 'Sans titre'}</h3>
                    <div className="project-details">
                      <div className="detail-item">
                        <div className="detail-icon">
                          <i className="fas fa-calendar"></i>
                        </div>
                        <div className="detail-text">
                          <span className="detail-label">Dernière mise à jour</span>
                          <span className="detail-value">{formatDate(project.lastModifiedDate)}</span>
                        </div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-icon">
                          <i className="fas fa-file"></i>
                        </div>
                        <div className="detail-text">
                          <span className="detail-label">Fichiers</span>
                          <span className="detail-value">{project.ifcFiles?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            ))}
            {!projects.some(project => project.status !== 'Actif') && (
              <div className="empty-state">
                <p>Aucun projet en attente pour le moment.</p>
              </div>
            )}
          </div>
        </section>

        {/* Modal de partage */}
        {showShareModal && selectedProject && (
          <div className="modal-overlay">
            <div className="share-modal">
              <div className="modal-header">
                <h3>Partager le projet : {selectedProject.name}</h3>
                <button className="close-button" onClick={handleCloseShareModal}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="modal-content">
                <div className="share-options">
                  <button className="share-button">
                    <i className="fas fa-envelope"></i>
                    <span>Partager par email</span>
                  </button>
                  <button className="share-button">
                    <i className="fas fa-link"></i>
                    <span>Copier le lien</span>
                  </button>
                  <button className="share-button">
                    <i className="fas fa-user-plus"></i>
                    <span>Ajouter des collaborateurs</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="dashboard-footer">
          <section className="activity-section">
            <div className="section-header">
              <h2>
                <i className="fas fa-history"></i>
                Activités Récentes
              </h2>
              <button className="action-button">
                <span>Voir tout</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            
            <div className="activity-timeline">
              {activities.map((activity, index) => (
                <div key={`${activity.id}-${index}`} className="activity-item">
                  <div className="activity-content">
                    <div className="activity-date">
                      <i className="far fa-clock"></i>
                      {formatDate(activity.date)}
                    </div>
                    <div className="activity-text">
                      {activity.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          <section className="notifications-section">
            <div className="section-header">
              <h2>
                <i className="fas fa-bell"></i>
                Notifications Récentes
              </h2>
              <button 
                className="action-button"
                onClick={() => navigate('/notifications')}
              >
                <span>Voir tout</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            
            <div className="notifications-list">
              {recentNotifications.length > 0 ? (
                recentNotifications.map((notification, index) => (
                  <div 
                    key={`${notification.id || index}`} 
                    className={`dashboard-notification ${notification.isRead ? '' : 'unread'}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-icon">
                      {notification.type === 'task' && <i className="fas fa-tasks"></i>}
                      {notification.type === 'message' && <i className="fas fa-envelope"></i>}
                      {notification.type === 'system' && <i className="fas fa-cog"></i>}
                      {!notification.type && <i className="fas fa-bell"></i>}
                    </div>
                    <div className="notification-content">
                      <div className="notification-header">
                        <h4>{notification.title || 'Notification'}</h4>
                        <span>{notification.formattedDate}</span>
                      </div>
                      <p>{notification.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-notifications">
                  <i className="fas fa-check-circle"></i>
                  <p>Aucune notification récente</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
