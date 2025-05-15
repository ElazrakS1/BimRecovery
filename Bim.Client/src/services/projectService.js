import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

const API_URL = `${API_BASE_URL}/api/projects`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const getProjects = async () => {
  try {
    const response = await axios.get(API_URL, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};

export const getProject = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};

export const createProject = async (projectData) => {
  try {
    // S'assurer que les champs requis sont présents
    if (!projectData.name || projectData.name.trim() === '') {
      throw new Error('Le nom du projet est requis');
    }
    
    // Nettoyer les données avant envoi
    const cleanedData = {
      name: projectData.name.trim(),
      description: projectData.description ? projectData.description.trim() : ''
    };
    
    const response = await axios.post(API_URL, cleanedData, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    handleAuthError(error);
    // Amélioration du message d'erreur pour un meilleur débogage
    if (error.response) {
      // Erreur de la réponse du serveur
      console.error('Détails de l\'erreur serveur:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // Erreur si aucune réponse n'a été reçue
      console.error('Aucune réponse reçue:', error.request);
    }
    throw error;
  }
};

export const updateProject = async (id, projectData) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, projectData, {
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
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_URL}/${projectId}/files`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};

export const deleteProject = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};

export const deleteFile = async (projectId, fileId) => {
  try {
    const response = await axios.delete(`${API_URL}/${projectId}/files/${fileId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};

export const shareProjectByEmail = async (projectId, emailTo) => {
  try {
    const projectUrl = `${window.location.origin}/projects/${projectId}`;
    const response = await axios.post(
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

const handleAuthError = (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
  console.error('API Error:', error);
};