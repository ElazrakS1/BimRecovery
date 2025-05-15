import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

const API_URL = `${API_BASE_URL}/api`;

export const uploadIFCFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_URL}/IFC/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error uploading IFC file:', error);
    throw error;
  }
};

export const getIFCFile = async (fileId) => {
  try {
    const response = await axios.get(`${API_URL}/IFC/${fileId}`, {
      responseType: 'blob',
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching IFC file:', error);
    throw error;
  }
};

export const convertIFCToPDF = async (projectId, fileId) => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${API_URL}/projects/${projectId}/files/${fileId}/pdf`, {
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Check if the response is actually a JSON error message
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('application/json')) {
      const reader = new FileReader();
      const errorText = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsText(response.data);
      });
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.message || 'Error converting IFC to PDF');
    }

    return response.data;
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      const reader = new FileReader();
      const errorText = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsText(error.response.data);
      });
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || errorData.error || 'Error converting IFC to PDF');
      } catch (e) {
        console.error('Error parsing error response:', e);
      }
    }
    console.error('Error converting IFC to PDF:', error);
    throw error;
  }
};

export const convertIFCToXML = async (projectId, fileId) => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${API_URL}/projects/${projectId}/files/${fileId}/xml`, {
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Check if the response is actually a JSON error message
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('application/json')) {
      const reader = new FileReader();
      const errorText = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsText(response.data);
      });
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.message || 'Error converting IFC to XML');
    }

    return response.data;
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      const reader = new FileReader();
      const errorText = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsText(error.response.data);
      });
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || errorData.error || 'Error converting IFC to XML');
      } catch (e) {
        console.error('Error parsing error response:', e);
      }
    }
    console.error('Error converting IFC to XML:', error);
    throw error;
  }
};