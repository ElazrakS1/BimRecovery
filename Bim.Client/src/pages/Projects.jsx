import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getProjects, createProject, deleteProject } from '../services/projectService';
import ProjectCard from '../components/projects/ProjectCard';
import ProjectDetails from './ProjectDetails';
import './Projects.css';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
    // Utilisation des hooks de react-router au niveau racine du composant
  const params = useParams();
  const id = params.id;
  const location = useLocation();
  
  // Déterminer si nous sommes sur la page de détails d'un projet
  const isProjectDetails = location.pathname.includes('/projects/') && location.pathname !== '/projects' && location.pathname !== '/projects/';
  
  console.log('DEBUG - Params:', params, 'ID parameter:', id, 'Path:', location.pathname);
  // Supprimé le chargement automatique ici car il est maintenant dans l'autre useEffect
    // Hook useEffect pour la redirection - simplifié pour éviter les boucles de redirection
  useEffect(() => {
    // Log pour aider au debug
    console.log('Route actuelle:', location.pathname, 'isProjectDetails:', isProjectDetails, 'ID:', id);
    
    // Charger les projets seulement si nous sommes sur la page principale des projets
    if (!id && location.pathname === '/projects') {
      loadProjects();
    }
  }, [id, location.pathname, isProjectDetails]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setError(null); // Réinitialiser les erreurs précédentes
      const data = await getProjects();
      
      if (!data || !Array.isArray(data)) {
        console.error('Format de données invalide:', data);
        setError('Format de données invalide reçu du serveur');
        setProjects([]);
        return;
      }
      
      setProjects(data);
    } catch (err) {
      // Message d'erreur plus détaillé pour les utilisateurs
      const errorMessage = err.response?.status === 401 
        ? 'Session expirée. Veuillez vous reconnecter.' 
        : err.response?.status === 500
          ? 'Erreur serveur. Veuillez réessayer plus tard.'
          : err.message === 'Network Error' 
            ? 'Erreur de réseau. Veuillez vérifier votre connexion internet.'
            : 'Erreur lors du chargement des projets';
            
      setError(errorMessage);
      console.error('Erreur détaillée:', err);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      // Validation côté client
      if (!newProject.name || newProject.name.trim() === '') {
        setError('Le nom du projet est requis');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      const project = await createProject(newProject);
      setProjects([...projects, project]);
      setShowCreateModal(false);
      setNewProject({ name: '', description: '' });
    } catch (err) {
      console.error('Erreur détaillée lors de la création du projet:', err);
      // Extraire le message d'erreur spécifique de la réponse API si disponible
      if (err.response && err.response.data && err.response.data.message) {
        setError(`Erreur: ${err.response.data.message}`);
      } else {
        setError('Erreur lors de la création du projet. Veuillez vérifier les informations saisies.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await deleteProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err) {
      setError('Erreur lors de la suppression du projet');
      console.error('Erreur:', err);
    }
  };  
    // Si nous avons un ID de projet dans les paramètres, afficher les détails
  if (id) {
    console.log('Affichage des détails du projet avec ID:', id);
    return <ProjectDetails projectId={id} />;
  }
  
  // Sinon, afficher la liste des projets
  return (
    <div className="projects-container">
      <div className="header">
        <h1>Projets</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="create-button"
        >
          <i className="fas fa-plus"></i>
          Créer un projet
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          {error}
          <button 
            onClick={loadProjects} 
            className="retry-button"
            title="Réessayer">            <i className="fas fa-sync"></i> Réessayer
          </button>
        </div>
      )}      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement des projets...</p>
        </div>
      ) : (
        <div className="project-grid" style={{width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem'}}>
          {projects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
      )}{showCreateModal && (
            <div className="create-project-modal">
              <div className="modal-content">
                <div className="modal-header">
                  <h2>Créer un nouveau projet</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="close-button"
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={handleCreateProject}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label htmlFor="name">Nom</label>
                      <input
                        id="name"
                        type="text"
                        value={newProject.name}
                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="description">Description</label>
                      <textarea
                        id="description"
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        rows="3"
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="cancel-button"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="submit-button"
                    >
                      Créer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
    </div>
  );
}