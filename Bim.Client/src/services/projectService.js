import api from '../config/api.config';
import { API_BASE_URL } from '../config/api.config';

const API_URL = `${API_BASE_URL}/api/Projects`; // Noter le P majuscule pour correspondre au contrôleur backend

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) {
    console.error('Aucun jeton d\'authentification trouvé');
    
    // Vérifier si nous avons déjà redirigé récemment pour éviter une boucle
    const lastRedirect = localStorage.getItem('lastAuthRedirect');
    const now = Date.now();
    
    if (!lastRedirect || (now - parseInt(lastRedirect)) > 5000) {
      localStorage.setItem('lastAuthRedirect', now.toString());
      console.warn('Redirection vers la page de connexion...');
      // Rediriger vers la page de connexion après un court délai
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
    
    throw new Error('Aucun jeton d\'authentification trouvé');
  }
  
  console.log('Token trouvé:', token.substring(0, 10) + '...');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const getProjects = async () => {
  try {
    console.log("Tentative de récupération des projets depuis:", API_URL);
    const response = await api.get(API_URL);
    console.log("Projets récupérés avec succès:", response.data);
    return response.data;
  } catch (error) {
    console.error("Erreur détaillée lors de la récupération des projets:", { 
      message: error.message, 
      status: error.response?.status,
      data: error.response?.data,
      config: error.config
    });
    handleAuthError(error);
    throw error;
  }
};

export const getProject = async (id) => {
  if (!id) {
    console.error("ID de projet non défini");
    throw new Error("ID de projet non défini");
  }
  
  let headers;
  try {
    headers = getAuthHeaders();
  } catch (error) {
    console.error("Impossible d'obtenir les en-têtes d'authentification:", error.message);
    throw error;
  }
    
  try {
    console.log(`Tentative de récupération du projet avec ID: ${id} depuis: ${API_URL}/${id}`);
    const response = await api.get(`${API_URL}/${id}`, {
      headers,
      timeout: 30000 // Augmenter le timeout pour les connexions lentes
    });
    
    if (!response.data) {
      throw new Error('Réponse vide du serveur');
    }

    // Ensure data structure is correct
    const projectData = {
      ...response.data,
      ifcFiles: response.data.ifcFiles || response.data.files || []
    };

    // Convert ifcFiles to array if needed
    if (projectData.ifcFiles && !Array.isArray(projectData.ifcFiles)) {
      console.warn('Converting ifcFiles to array:', projectData.ifcFiles);
      projectData.ifcFiles = Object.values(projectData.ifcFiles);
    }

    // Validate each file object
    projectData.ifcFiles = (projectData.ifcFiles || []).map(file => ({
      id: file.id,
      fileName: file.fileName || 'Unknown',
      uploadDate: file.uploadDate || new Date(),
      fileSize: file.fileSize || 0,
      filePath: file.filePath || '',
    }));

    console.log("Projet récupéré avec succès:", {
      url: `${API_URL}/${id}`,
      status: response.status,
      data: {
        id: projectData.id,
        name: projectData.name,
        status: projectData.status,
        createdDate: projectData.createdDate,
        ifcFiles: projectData.ifcFiles,
        filesCount: projectData.ifcFiles?.length || 0
      }
    });
    
    return projectData;
  } catch (error) {
    console.error("Erreur détaillée lors de la récupération du projet:", { 
      message: error.message, 
      status: error.response?.status,
      data: error.response?.data,
      config: error.config
    });
    
    if (error.response?.status === 401) {
      console.error("Erreur d'authentification lors de la récupération du projet");
    }
    
    handleAuthError(error);
    throw error;
  }
};

export const createProject = async (projectData) => {
  try {
    console.log('Creating project:', projectData);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await api.post(`${API_BASE_URL}/api/projects`, projectData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Project created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating project:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const updateProject = async (id, projectData) => {
  try {
    const response = await api.put(`${API_URL}/${id}`, projectData, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};

// Fonction pour mettre à jour le statut d'un projet
export const updateProjectStatus = async (id, status) => {
  try {
    const response = await api.put(`${API_URL}/${id}/status`, { status }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};

export const uploadFileToProject = async (projectId, file) => {
  try {
    console.log('Initializing file upload:', {
      projectId,
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      fileType: file.type
    });

    // Validate auth token
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      const error = new Error('Token d\'authentification non trouvé');
      error.code = 'AUTH_REQUIRED';
      throw error;
    }

    // Validate file size (1GB max)
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (file.size > maxSize) {
      const error = new Error('Le fichier est trop volumineux (maximum 1 GB)');
      error.code = 'FILE_TOO_LARGE';
      throw error;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      const error = new Error('Seuls les fichiers IFC sont autorisés');
      error.code = 'INVALID_FILE_TYPE';
      throw error;
    }

    const formData = new FormData();
    formData.append('file', file);

    console.log('Starting file upload to:', `${API_URL}/${projectId}/files`);
    
    const response = await api.post(`${API_URL}/${projectId}/files`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      },
      // Extended timeout for large files
      timeout: 600000, // 10 minutes
      onUploadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${progress}%`);
      }
    });

    console.log('Server response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Upload error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config
    });

    // Rethrow specific errors
    if (error.code === 'AUTH_REQUIRED' || 
        error.code === 'FILE_TOO_LARGE' || 
        error.code === 'INVALID_FILE_TYPE') {
      throw error;
    }

    // Handle other errors
    handleAuthError(error);
    
    if (error.response?.status === 413) {
      throw new Error('Le fichier est trop volumineux pour le serveur');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Le téléchargement a pris trop de temps. Veuillez réessayer.');
    } else if (!error.response) {
      throw new Error('Erreur de connexion au serveur. Vérifiez votre connexion internet.');
    } else {
      throw new Error(error.response?.data?.message || 'Erreur lors du téléchargement du fichier');
    }
  }
};

export const deleteProject = async (id) => {
  try {
    console.log('Attempting to delete project:', id);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    await api.delete(`${API_BASE_URL}/api/Projects/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Project deleted successfully:', id);
  } catch (error) {
    console.error('Error deleting project:', {
      id,
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.response?.status === 404) {
      throw new Error('Project not found');
    } else if (error.response?.status === 401) {
      throw new Error('Session expired. Please login again.');
    } else {
      throw new Error(error.response?.data?.message || 'Failed to delete project');
    }
  }
};

export const deleteFile = async (projectId, fileId) => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    await api.delete(`${API_BASE_URL}/api/projects/${projectId}/files/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('File deleted successfully:', { projectId, fileId });
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

export const shareProjectByEmail = async (projectId, emailTo) => {
  try {
    const projectUrl = `${window.location.origin}/projects/${projectId}`;
    const response = await api.post(
      `${API_URL}/${projectId}/share`,
      { emailTo, projectUrl },
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};

// Tracker global pour savoir si une redirection est déjà en cours
let redirectInProgress = false;

const handleAuthError = (error) => {
  // Gérer les erreurs d'authentification
  if (error.response?.status === 401) {
    console.log("Erreur d'authentification 401 détectée, préparation de redirection vers la page de connexion...");
    console.log("URL qui a causé l'erreur 401:", error.config?.url);
    
    // Éviter des redirections multiples
    if (redirectInProgress) {
      console.log("Redirection déjà en cours, ignorée");
      return;
    }
    
    // Vérifier si nous avons déjà redirigé récemment pour éviter une boucle
    const lastRedirect = localStorage.getItem('lastAuthRedirect');
    const now = Date.now();
    
    if (!lastRedirect || (now - parseInt(lastRedirect)) > 10000) { // 10 secondes au lieu de 5
      // Stocker le moment de la redirection
      localStorage.setItem('lastAuthRedirect', now.toString());
      
      // Nettoyer les tokens
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      console.log("Redirection vers login dans 1 seconde...");
      redirectInProgress = true;
        // Délai plus long pour éviter les redirections en cascade
      setTimeout(() => {
        redirectInProgress = false;
        window.location.href = '/login';
      }, 1000);
    } else {
      console.log("Redirection ignorée car trop récente");
    }
    return;
  }
  
  // Gérer les erreurs de connexion au serveur
  if (error.code === 'ECONNABORTED' || !error.response) {
    console.error('Erreur de connexion au serveur:', error.message);
    return;
  }
  
  // Gérer d'autres codes d'erreur HTTP courants
  if (error.response?.status === 404) {
    console.error('Ressource non trouvée (404):', error.config?.url);
  } else if (error.response?.status === 403) {
    console.error('Accès non autorisé (403)');
  } else if (error.response?.status === 500) {
    console.error('Erreur interne du serveur (500)');
  } else {
    console.error('Erreur API:', error);
  }
};