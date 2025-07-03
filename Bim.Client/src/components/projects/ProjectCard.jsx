import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadFileToProject, updateProjectStatus } from '../../services/projectService';
import { AuthContext } from '../../context/AuthContext';
import './ProjectCard.css';

export default function ProjectCard({ project, onDelete }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);

  const handleFileUpload = async (event) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.ifc')) {
      setError('Only IFC files are supported');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await uploadFileToProject(project.id, file);
      window.location.reload();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.message || 'Failed to upload file');
        console.error('Error uploading file:', err);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      try {
        await onDelete(project.id);
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Échec de la suppression du projet');
          console.error('Error deleting project:', err);
        }
      } 
    }
  };  const handleView = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log("Navigating to project details:", project.id);
    
    // Vérifier si l'utilisateur est authentifié avant de naviguer
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.warn("Tentative de navigation sans authentification, redirection vers login");
      window.location.href = '/login';
      return;
    }
    
    // Naviguer vers les détails du projet avec navigate pour une expérience plus fluide
    navigate(`/projects/${project.id}`);
  };
  
  const handleStatusToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    const newStatus = project.status === 'Actif' ? 'En attente' : 'Actif';
    setIsUpdatingStatus(true);
    
    try {
      await updateProjectStatus(project.id, newStatus);
      // Reload to update the UI
      window.location.reload();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Échec de la mise à jour du statut');
        console.error('Error updating status:', err);
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  return (
    <div className="project-card" onClick={handleView} style={{cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', boxSizing: 'border-box'}}>
      <div className="project-header" style={{width: '100%', boxSizing: 'border-box'}}>
        <h3 style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{project.name}</h3>
        <div className="project-actions">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleView(e);
            }}
            className="action-button view"
            title="Voir les détails"
          >
            <i className="fas fa-eye"></i>
          </button>
          <label 
            className="action-button upload"
            title="Ajouter un fichier IFC"
          >
            <input
              type="file"
              accept=".ifc"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="file-upload-input"
            />
            <i className={`fas ${isUploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
          </label>
          <button
            onClick={handleStatusToggle}
            className={`action-button ${project.status === 'Actif' ? 'status-active' : 'status-pending'}`}
            title={project.status === 'Actif' ? 'Mettre en attente' : 'Activer le projet'}
            disabled={isUpdatingStatus}
          >
            <i className={`fas ${isUpdatingStatus ? 'fa-spinner fa-spin' : project.status === 'Actif' ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
          </button>
          <button 
            onClick={handleDelete} 
            className="action-button delete"
            title="Supprimer le projet"
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
      </div>
      
      <p className="project-description">{project.description}</p>
      
      <div className="project-metadata" style={{marginTop: 'auto', width: '100%', boxSizing: 'border-box'}}>
        <div className="metadata-item">
          <i className="fas fa-calendar"></i>
          <span>Créé le {new Date(project.createdDate).toLocaleDateString()}</span>
        </div>
        {project.lastModifiedDate && (
          <div className="metadata-item">
            <i className="fas fa-clock"></i>
            <span>Modifié le {new Date(project.lastModifiedDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>{error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          {error}
          <button 
            onClick={() => setError(null)} 
            className="close-error-button"
            title="Fermer"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
    </div>
  );
}