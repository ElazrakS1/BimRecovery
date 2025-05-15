import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
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

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      setError('Erreur lors du chargement des projets');
      console.error('Erreur:', err);
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

  return (
    <Routes>
      <Route path="/" element={
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
            </div>
          )}

          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Chargement des projets...</p>
            </div>
          ) : (
            <div className="project-grid">
              {projects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  onDelete={handleDeleteProject}
                />
              ))}
            </div>
          )}

          {showCreateModal && (
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
      } />
      <Route path=":id" element={<ProjectDetails />} />
    </Routes>
  );
}