import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadFileToProject } from '../../services/projectService';
import { AuthContext } from '../../context/AuthContext';
import './ProjectCard.css';

export default function ProjectCard({ project, onDelete }) {
  const [isUploading, setIsUploading] = useState(false);
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
  };

  const handleView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/projects/${project.id}`);
  };

  return (
    <div className="project-card">
      <div className="project-header">
        <h3>{project.name}</h3>
        <div className="project-actions">
          <button 
            onClick={handleView} 
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
            onClick={handleDelete} 
            className="action-button delete"
            title="Supprimer le projet"
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
      </div>
      
      <p className="project-description">{project.description}</p>
      
      <div className="project-metadata">
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
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
}