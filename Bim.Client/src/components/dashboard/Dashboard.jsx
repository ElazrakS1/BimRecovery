import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../../services/projectService';
import './Dashboard.css';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalFiles: 0,
    recentActivity: 0
  });
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [hoveredProject, setHoveredProject] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const projectsData = await getProjects();
        setProjects(projectsData);
        
        const activeProjects = projectsData.filter(p => p.status === 'En cours').length;
        const totalFiles = projectsData.reduce((acc, p) => acc + (p.files?.length || 0), 0);
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
          }));
        setActivities(recentActivitiesList);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
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

  const handleEditProject = (projectId) => {
    navigate(`/projects/${projectId}/edit`);
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
        </div>

        <section className="recent-projects">
          <div className="section-header">
            <h2>Projets en Cours</h2>
            <button 
              className="action-button"
              onClick={handleCreateProject}
            >
              <i className="fas fa-plus"></i>
              <span>Nouveau Projet</span>
            </button>
          </div>
          
          <div className="project-grid">
            {projects.map((project) => (
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
                  <div className={`project-status-badge status-${project.status?.toLowerCase() || 'pending'}`}>
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
                        <span className="detail-value">{project.files?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
      </div>
    </div>
  );
};

export default Dashboard;
