import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api.config';
import { getProject, deleteFile } from '../services/projectService';
import { convertIFCToPDF, convertIFCToXML } from '../services/ifcService';
import './ProjectDetails.css';

export default function ProjectDetails() {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);
  const [convertingPdf, setConvertingPdf] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await getProject(id);
      setProject(data);
    } catch (err) {
      setError('Impossible de charger les détails du projet');
      console.error('Erreur de chargement du projet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/projects');
  };

  const handleDeleteFile = async (file) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) {
      try {
        await deleteFile(project.id, file.id);
        await loadProject(); // Recharger le projet pour mettre à jour la liste des fichiers
      } catch (err) {
        setError('Erreur lors de la suppression du fichier');
        console.error('Erreur de suppression:', err);
      }
    }
  };

  const handleConvertToXml = async (file) => {
    try {
      setConverting(true);
      setSelectedFile(file.id);
      const xmlData = await convertIFCToXML(file.id);
      
      // Créer et télécharger le fichier XML
      const blob = new Blob([xmlData], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.fileName.replace('.ifc', '')}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erreur lors de la conversion en XML');
      console.error('Erreur de conversion XML:', err);
    } finally {
      setConverting(false);
      setSelectedFile(null);
    }
  };

  const handleConvertToPdf = async (file) => {
    try {
      setConvertingPdf(true);
      setSelectedFile(file.id);
      const pdfData = await convertIFCToPDF(file.id);
      
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.fileName.replace('.ifc', '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erreur lors de la conversion en PDF');
      console.error('Erreur de conversion PDF:', err);
    } finally {
      setConvertingPdf(false);
      setSelectedFile(null);
    }
  };

  if (loading) {
    return (
      <div className="project-details">
        <div className="loading">
          <div className="loading-spinner" />
          <p>Chargement des détails du projet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-details">
        <div className="error">
          <i className="fas fa-exclamation-circle"></i>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-details">
        <div className="not-found">
          <i className="fas fa-folder-open"></i>
          <p>Projet non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="project-details">
      <div className="project-details-header">
        <button onClick={handleBack} className="back-button">
          <i className="fas fa-arrow-left"></i>
          Retour aux projets
        </button>
        <h1>{project.name}</h1>
      </div>

      <div className="project-info">
        <p className="description">{project.description || 'Aucune description disponible'}</p>
        
        <div className="project-metadata">
          <div className="metadata-item">
            <span className="label">Créé le</span>
            <span className="value">
              <i className="fas fa-calendar"></i>
              {new Date(project.createdDate).toLocaleDateString()}
            </span>
          </div>
          {project.lastModifiedDate && (
            <div className="metadata-item">
              <span className="label">Dernière modification</span>
              <span className="value">
                <i className="fas fa-clock"></i>
                {new Date(project.lastModifiedDate).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="metadata-item">
            <span className="label">Statut</span>
            <span className="value">
              <i className="fas fa-info-circle"></i>
              {project.status || 'Non défini'}
            </span>
          </div>
          <div className="metadata-item">
            <span className="label">Fichiers IFC</span>
            <span className="value">
              <i className="fas fa-cube"></i>
              {project.ifcFiles?.length || 0} fichiers
            </span>
          </div>
        </div>
      </div>

      <div className="files-container">
        <h2>
          <i className="fas fa-file-alt"></i>
          Fichiers du projet
        </h2>
        
        {project.ifcFiles && project.ifcFiles.length > 0 ? (
          <div className="files-grid">
            {project.ifcFiles.map(file => (
              <div key={file.id} className="file-card">
                <div className="file-icon">
                  <i className="fas fa-file-alt"></i>
                </div>
                <div className="file-info">
                  <h3>{file.fileName}</h3>
                  <div className="file-meta">
                    <span>
                      <i className="fas fa-calendar-alt"></i>
                      {new Date(file.uploadDate).toLocaleDateString()}
                    </span>
                    <span>
                      <i className="fas fa-file-upload"></i>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="file-actions">
                    <button 
                      onClick={() => handleConvertToXml(file)} 
                      className="convert-xml-button"
                      disabled={converting && selectedFile === file.id}
                    >
                      <i className="fas fa-file-code"></i>
                      {converting && selectedFile === file.id ? 'Conversion...' : 'XML'}
                    </button>
                    <button 
                      onClick={() => handleConvertToPdf(file)}
                      className="convert-pdf-button"
                      disabled={convertingPdf && selectedFile === file.id}
                    >
                      <i className="fas fa-file-pdf"></i>
                      {convertingPdf && selectedFile === file.id ? 'Conversion...' : 'PDF'}
                    </button>
                    <button 
                      onClick={() => handleDeleteFile(file)}
                      className="delete-file-button"
                    >
                      <i className="fas fa-trash"></i>
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-files">
            <i className="fas fa-file-upload"></i>
            <p>Aucun fichier n'a encore été téléchargé</p>
          </div>
        )}
      </div>
    </div>
  );
}