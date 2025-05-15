import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

const API_URL = `${API_BASE_URL}/api/auth/`;

export const login = async (email, password) => {
  try {
    console.log('Attempting to connect to:', API_URL + 'login'); // Debug log
    
    const response = await axios.post(API_URL + 'login', {
      email,
      password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Server response:', response); // Debug log
    return response.data;
    
  } catch (error) {
    console.error('Auth service error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    throw {
      message: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
};

export const register = async (userData) => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await axios.post(API_URL + 'register', userData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Registration error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    throw {
      message: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) return JSON.parse(userStr);
  return null;
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
};

// Configurer axios pour inclure le token dans les headers
axios.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
