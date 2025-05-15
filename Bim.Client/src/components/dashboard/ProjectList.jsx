import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProjectList.css';

const ProjectList = ({ projects, loading }) => {
  const navigate = useNavigate();
  const [hoveredProject, setHoveredProject] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  
  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleEdit = (e, project) => {
    e.stopPropagation();
    navigate(`/projects/${project.id}?edit=true`);
  };

  const handleShare = (e, project) => {
    e.stopPropagation();
    setSelectedProject(project);
    setShowShareModal(true);
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setSelectedProject(null);
  };

  if (loading) {
    return (
      <div className="project-list">
        {[1, 2, 3, 4].map((placeholder) => (
          <div key={placeholder} className="project-card loading">
            <div className="project-thumbnail skeleton"></div>
            <div className="project-info">
              <div className="skeleton-text"></div>
              <div className="project-details">
                <div className="skeleton-text small"></div>
                <div className="skeleton-text small"></div>
                <div className="skeleton-text small"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (!projects || projects.length === 0) {
    return (
      <div className="no-projects">
        <i className="fas fa-folder-open"></i>
        <p>Aucun projet disponible</p>
        <p>Créez votre premier projet pour commencer</p>
      </div>
    );
  }
  
  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  return (
    <>
      <div className="project-list">
        {projects.map(project => (
          <div 
            key={project.id} 
            className="project-card"
            onMouseEnter={() => setHoveredProject(project.id)}
            onMouseLeave={() => setHoveredProject(null)}
            onClick={() => handleProjectClick(project.id)}
          >
            <div className="project-thumbnail">
              {project.thumbnail ? (
                <img src={project.thumbnail} alt={project.name} />
              ) : (
                <div className="project-thumbnail-placeholder">
                  <i className="fas fa-building"></i>
                </div>
              )}
              {hoveredProject === project.id && (
                <div className="project-actions">
                  <button 
                    className="action-button"
                    onClick={(e) => handleEdit(e, project)}
                    title="Modifier le projet"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button 
                    className="action-button"
                    onClick={(e) => handleShare(e, project)}
                    title="Partager le projet"
                  >
                    <i className="fas fa-share-alt"></i>
                  </button>
                </div>
              )}
            </div>
            <div className="project-info">
              <h3>{project.name}</h3>
              <div className="project-details">
                <p>
                  <i className="fas fa-building"></i>
                  <span>{project.client || 'Client non spécifié'}</span>
                </p>
                <p>
                  <i className="fas fa-cubes"></i>
                  <span>
                    {project.modelsCount} 
                    {project.modelsCount > 1 ? ' maquettes' : ' maquette'}
                  </span>
                </p>
                <p>
                  <i className="fas fa-calendar-alt"></i>
                  <span>Modifié le {formatDate(project.lastModified)}</span>
                </p>
                {project.status && (
                  <p className={`project-status ${project.status.toLowerCase()}`}>
                    <i className="fas fa-circle"></i>
                    <span>{project.status}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

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
    </>
  );
};

export default ProjectList;
