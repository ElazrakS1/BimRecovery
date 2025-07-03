import { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api.config';
import { getProject, deleteFile, uploadFileToProject } from '../services/projectService';
import { convertIFCToPDF, convertIFCToXML } from '../services/ifcService';
import TaskManagement from '../components/Tasks/TaskManagement';
import { AuthContext } from '../context/AuthContext';
import './ProjectDetails.css';

export default function ProjectDetails({ projectId }) {
  // State initialization
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);
  const [convertingPdf, setConvertingPdf] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Hooks and context
  const params = useParams();
  const navigate = useNavigate();
  const id = projectId || params?.id;
  const { isAuthenticated, checkAuth } = useContext(AuthContext);
  
  // Define loadProject function using useCallback
  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Chargement du projet - Vérification du token avant appel API');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        console.error('loadProject - Token manquant, impossible de charger le projet');
        setError('Session expirée. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }
      
      console.log('Chargement du projet - Appel à getProject avec ID:', id);
      const data = await getProject(id);
      
      if (!data) {
        console.error('Données de projet invalides:', data);
        setError('Projet non trouvé ou format de données invalide');
        setLoading(false);
        return;
      }
      
      console.log('Projet chargé avec succès:', {
        id: data.id,
        name: data.name,
        ifcFiles: data.ifcFiles,
        filesCount: data.ifcFiles?.length || 0
      });

      // Validate ifcFiles array
      if (data.ifcFiles && !Array.isArray(data.ifcFiles)) {
        console.error('Format invalide pour ifcFiles:', data.ifcFiles);
        data.ifcFiles = [];
      }
      
      setProject(data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur lors du chargement du projet:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status 
      });
      
      const errorMessage = err.response?.status === 401 
        ? 'Session expirée. Veuillez vous reconnecter.'
        : err.response?.status === 404
          ? 'Projet non trouvé'
          : err.response?.status === 500
            ? 'Erreur serveur. Veuillez réessayer plus tard.'
            : err.message === 'Network Error' 
              ? 'Erreur de réseau. Veuillez vérifier votre connexion internet.'
              : 'Impossible de charger les détails du projet';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]); // Only depend on id, not on setState functions
  
  // Load project effect
  useEffect(() => {
    const verifyAndLoad = async () => {
      if (id) {
        console.log('ProjectDetails - Chargement du projet avec ID:', id);
        
        // Verify authentication
        if (!isAuthenticated) {
          const isAuthValid = await checkAuth();
          if (!isAuthValid) {
            console.error('ProjectDetails - Authentification requise');
            setError('Vous devez être connecté pour voir les détails du projet');
            setLoading(false);
            return;
          }
        }
        
        await loadProject();
      } else {
        console.error('ProjectDetails - Aucun ID de projet trouvé');
        setError('Aucun ID de projet spécifié');
        setLoading(false);
      }    };
    
    verifyAndLoad();
  }, [id, isAuthenticated, loadProject, checkAuth]);

  // Files display debugging 
  useEffect(() => {
    if (project) {
      console.log('Project data debug:', {
        id: project.id,
        name: project.name,
        rawFiles: project.files,
        rawIfcFiles: project.ifcFiles,
        hasFiles: !!project.ifcFiles,
        filesLength: project.ifcFiles?.length || 0,
        filesArray: project.ifcFiles,
        isArray: Array.isArray(project.ifcFiles),
        filesType: typeof project.ifcFiles
      });
    }
  }, [project]);

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
      console.log('Starting XML conversion:', { projectId: project.id, fileId: file.id, fileName: file.fileName });
      setConverting(true);
      setSelectedFile(file.id);
      const xmlData = await convertIFCToXML(project.id, file.id);
      
      // Créer et télécharger le fichier XML
      const blob = new Blob([xmlData], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.fileName.replace('.ifc', '')}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la conversion en XML';
      setError(errorMessage);
      console.error('Erreur de conversion XML:', err);
    } finally {
      setConverting(false);
      setSelectedFile(null);
    }
  };  const handleConvertToPdf = async (file) => {
    try {
      console.log('Starting PDF conversion for file:', { 
        projectId: project.id, 
        fileId: file.id, 
        fileName: file.fileName 
      });
      setError(null);
      setConvertingPdf(true);
      setSelectedFile(file.id);

      const pdfBlob = await convertIFCToPDF(project.id, file.id);
      
      // Validate PDF blob
      if (!(pdfBlob instanceof Blob)) {
        throw new Error('Invalid response from server');
      }

      if (!pdfBlob.type.includes('pdf')) {
        throw new Error('Server did not return a PDF file');
      }

      // Create and trigger download
      const url = window.URL.createObjectURL(pdfBlob);
      const fileName = `${project.name}_Report_${new Date().toISOString().slice(0,10)}.pdf`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // Append, click, and cleanup
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF conversion error:', err);
      const errorMessage = err.response?.data?.message || 
                         err.response?.data?.error ||
                         err.message || 
                         'Failed to generate PDF. Please try again.';
      setError(`Error: ${errorMessage}`);
    } finally {
      setConvertingPdf(false);
    }
  };
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset any previous state
    setIsUploading(true);
    setError(null);

    try {
      // Log upload attempt
      console.log('Tentative d\'upload du fichier:', {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        type: file.type
      });

      // Upload the file
      await uploadFileToProject(project.id, file);
      console.log('Upload réussi');

      // Reload project to update file list
      await loadProject();
    } catch (err) {
      console.error('Erreur lors de l\'upload:', err);

      // Handle session timeout
      if (err.response?.status === 401 || err.code === 'AUTH_REQUIRED') {
        navigate('/login');
        return;
      }

      // Set user-friendly error message
      const errorMessage = err.code === 'FILE_TOO_LARGE' ? 'Le fichier est trop volumineux (maximum 1 GB)' :
                         err.code === 'INVALID_FILE_TYPE' ? 'Seuls les fichiers IFC sont autorisés' :
                         err.response?.data?.message ||
                         err.message ||
                         'Erreur inattendue lors du téléchargement du fichier';

      setError(`Erreur: ${errorMessage}`);
      console.error('Détails de l\'erreur:', err);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="project-details">
        <div className="loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column' }}>
          <div className="loading-spinner" />
          <p style={{ marginTop: '20px', fontSize: '16px', color: '#555' }}>Chargement des détails du projet...</p>
        </div>
      </div>
    );
  }if (error) {
    // Détecter si c'est une erreur d'authentification
    const isAuthError = error.includes('Session expirée') || error.includes('vous reconnecter') || error.includes('connecté');
    
    return (
      <div className="project-details">
        <div className="error">
          <i className={`fas ${isAuthError ? 'fa-lock' : 'fa-exclamation-circle'}`}></i>
          <p>{error}</p>
          {!isAuthError && (
            <button 
              onClick={() => {
                loadProject();
              }} 
              className="retry-button"
            >
              <i className="fas fa-sync"></i> Réessayer
            </button>
          )}
          {isAuthError && (
            <button 
              onClick={() => {
                window.location.href = '/login';
              }} 
              className="login-button"
            >
              <i className="fas fa-sign-in-alt"></i> Se connecter
            </button>
          )}
          <button 
            onClick={handleBack} 
            className="back-button"
          >
            <i className="fas fa-arrow-left"></i> Retour aux projets
          </button>
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
  }  return (
    <div className="project-details" style={{width: '100%', boxSizing: 'border-box', padding: '1.5rem'}}>
      <div className="project-details-header" style={{width: '100%', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between'}}>
        <div className="header-left">
          <button onClick={handleBack} className="back-button">
            <i className="fas fa-arrow-left"></i>
            Retour aux projets
          </button>
          <h1>{project.name}</h1>
        </div>        {/* Removed global PDF conversion button */}
      </div>

      <div className="project-info" style={{width: '100%', boxSizing: 'border-box'}}>
        <p className="description">{project.description || 'Aucune description disponible'}</p>
        
        <div className="project-metadata" style={{width: '100%', boxSizing: 'border-box'}}>
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
            <span className="label">État des fichiers</span>
            <span className="value">
              <i className="fas fa-cube"></i>
              {project.ifcFiles?.length > 0 ? "Maquettes BIM disponibles" : "Aucune maquette BIM"}
            </span>
          </div>
        </div>
      </div>      <div className="files-container" style={{width: '100%', boxSizing: 'border-box'}}>
        <div className="files-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', boxSizing: 'border-box'}}>
          <h2>
            <i className="fas fa-file-alt"></i>
            Fichiers du projet ({project.ifcFiles?.length || 0})
          </h2>
          <div className="file-upload-container">
            <label className="file-upload-label">
              <input
                type="file"
                accept=".ifc"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="file-upload-input"
              />
              <span>
                {isUploading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Téléchargement...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus"></i>
                    Ajouter un fichier IFC
                  </>
                )}
              </span>
            </label>
          </div>
        </div>
        
        {project.ifcFiles && Array.isArray(project.ifcFiles) && project.ifcFiles.length > 0 ? (
          <div className="files-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', width: '100%', boxSizing: 'border-box'}}>
            {console.log('Rendu des fichiers:', project.ifcFiles)}
            {project.ifcFiles.map(file => (              <div key={file.id} className="file-card" style={{display: 'flex', flexDirection: 'column', height: '100%', width: '100%', boxSizing: 'border-box'}}>
                <div className="file-icon">
                  <i className="fas fa-file-alt"></i>
                </div>
                <div className="file-info" style={{width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', height: '100%'}}>
                  <h3>{file.fileName}</h3>
                  <div className="file-meta" style={{width: '100%', boxSizing: 'border-box'}}>                    
                    <span>
                      <i className="fas fa-calendar-alt"></i>
                      {new Date(file.uploadDate).toLocaleDateString()}
                    </span>
                    <span>
                      <i className="fas fa-file-upload"></i>
                      {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="file-actions" style={{marginTop: 'auto', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', boxSizing: 'border-box'}}>
                    <button 
                      onClick={() => handleConvertToXml(file)} 
                      className="convert-xml-button"
                      disabled={converting && selectedFile === file.id}
                      style={{flex: '1 1 auto', justifyContent: 'center', minWidth: 'fit-content'}}
                    >
                      <i className="fas fa-file-code"></i>
                      {converting && selectedFile === file.id ? 'Conversion...' : 'XML'}
                    </button>                    <button onClick={() => handleConvertToPdf(file)}
                      className="convert-pdf-button"
                      disabled={convertingPdf && selectedFile === file.id}
                      style={{flex: '1 1 auto', justifyContent: 'center', minWidth: 'fit-content'}}
                    >
                      <i className="fas fa-file-pdf"></i>
                      {convertingPdf && selectedFile === file.id ? 'Conversion...' : 'PDF'}
                    </button>
                    <button 
                      onClick={() => handleDeleteFile(file)}
                      className="delete-file-button"
                      style={{flex: '1 1 auto', justifyContent: 'center', minWidth: 'fit-content'}}
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
          </div>        )}
      </div>

      {/* Task Management Section */}
      <div className="project-tasks-section">
        <TaskManagement projectId={project.id} />
      </div>

      <div className="upload-section">
        <h2>
          <i className="fas fa-upload"></i>
          Télécharger un fichier IFC
        </h2>
        <input 
          type="file" 
          accept=".ifc" 
          onChange={handleFileUpload} 
          className="file-upload-input"
          disabled={isUploading}
        />
        {isUploading && <p className="uploading-message">Téléchargement en cours...</p>}
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}