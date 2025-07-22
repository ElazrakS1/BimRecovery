import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';
import api from '../config/api.config';

const API_URL = `${API_BASE_URL}/api/auth/`;

// Token validation and parsing
export const parseJwt = (token) => {
  try {
    // Enlever le préfixe Bearer si présent
    const actualToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
    
    const base64Url = actualToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonPayload);
    
    // Extraire les rôles des claims si nécessaire
    if (payload && payload.role) {
      payload.roles = Array.isArray(payload.role) ? payload.role : [payload.role];
    }
    
    // Si 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role' est présent, l'ajouter aux rôles
    if (payload && payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']) {
      const rolesClaim = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      if (!payload.roles) payload.roles = [];
      if (Array.isArray(rolesClaim)) {
        payload.roles.push(...rolesClaim);
      } else {
        payload.roles.push(rolesClaim);
      }
    }
    
    console.log('Token JWT décodé:', payload);
    return payload;
  } catch (error) {
    console.error('Erreur de parsing JWT:', error);
    return null;
  }
};

export const isTokenValid = (token) => {
  if (!token) return false;

  try {
    // Vérifier le format Bearer
    const actualToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;

    // Vérifier la structure JWT
    const parts = actualToken.split('.');
    if (parts.length !== 3) return false;

    // Decode payload
    const payload = JSON.parse(atob(parts[1]));

    // Vérifier l'expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;

    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return {
    'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const setAuthToken = (token) => {
  if (token) {
    // Ensure token is valid before storing
    if (!isTokenValid(token)) {
      console.error('Attempted to store invalid token');
      return false;
    }

    // Remove Bearer prefix if it exists and then add it back consistently
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    const tokenValue = `Bearer ${cleanToken}`;
    
    // Set token in both axios instances
    api.defaults.headers.common['Authorization'] = tokenValue;
    axios.defaults.headers.common['Authorization'] = tokenValue;
    
    // Log current auth state for debugging
    console.log('Auth token set in API clients:', {
      tokenStart: tokenValue.substring(0, 15) + '...',
      axiosAuthHeader: axios.defaults.headers.common['Authorization'] ? 'Set' : 'Not set',
      apiAuthHeader: api.defaults.headers.common['Authorization'] ? 'Set' : 'Not set'
    });
    
    return true;
  } else {
    delete api.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    return true;
  }
};

export const login = async (email, password) => {
  try {
    console.log('Attempting login...', {
      url: API_URL + 'login',
      timestamp: new Date().toISOString()
    });
    
    // Nettoyer les tokens existants avant la tentative de connexion
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    
    // Vérifier l'URL de l'API
    console.log(`API Base URL: ${api.defaults.baseURL}`);
    
    // Validation des entrées
    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }
    
    // Utiliser un timeout plus long pour les authentifications
    const response = await api.post(API_URL + 'login', {
      email,
      password
    }, {
      timeout: 10000, // 10 secondes
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('Login response:', {
      status: response.status,
      hasToken: !!response.data?.token,
      hasUserData: !!response.data?.user,
      timestamp: new Date().toISOString()
    });

    if (!response.data?.token) {
      throw new Error('No token received from server');
    }

    if (!isTokenValid(response.data.token)) {
      throw new Error('Server returned invalid token');
    }

    return response.data;
  } catch (error) {
    console.error('Login error:', error, {
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Erreur spécifique selon le type d'erreur
    if (error.response) {
      // Le serveur a répondu avec un code d'erreur
      if (error.response.status === 500) {
        throw new Error("Erreur serveur - Contactez l'administrateur système");
      } else if (error.response.status === 401) {
        throw new Error(error.response.data?.message || "Email ou mot de passe incorrect");
      } else if (error.response.status === 403) {
        throw new Error("Accès non autorisé - Votre compte pourrait être désactivé");
      } else {
        throw new Error(`Erreur ${error.response.status}: ${error.response.data?.message || "Une erreur s'est produite"}`);
      }
    } else if (error.request) {
      // La requête a été envoyée mais aucune réponse n'a été reçue
      throw new Error("Serveur inaccessible - Vérifiez votre connexion réseau");
    } else {
      // Erreur lors de la configuration de la requête
      throw error;
    }

    // Check for network connectivity issues
    if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') {
      throw new Error('Impossible de se connecter au serveur. Vérifiez que le serveur backend est démarré sur le port 5258.');
    }

    if (error.response?.status === 401) {
      throw new Error('Email ou mot de passe incorrect');
    }
    
    // Handle CORS errors
    if (error.message.includes('CORS') || error.message.includes('fetch')) {
      throw new Error('Erreur de configuration CORS. Contactez l\'administrateur.');
    }
    
    throw error;
  }
};

export const storeToken = (token, rememberMe = false) => {
  if (!token) return false;

  // Validate token before storing
  if (!isTokenValid(token)) {
    console.error('Invalid token detected during storage');
    return false;
  }

  // Ensure token has Bearer prefix
  const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  
  // Clear existing tokens
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  
  // Store in appropriate storage
  try {
    if (rememberMe) {
      localStorage.setItem('token', tokenValue);
    } else {
      sessionStorage.setItem('token', tokenValue);
    }
    return setAuthToken(tokenValue);
  } catch (error) {
    console.error('Error storing token:', error);
    return false;
  }
};

export const logout = () => {
  setAuthToken(null);
  
  // Clear stored tokens
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  
  // Clear any stored redirect paths
  sessionStorage.removeItem('redirectAfterLogin');
};

export const getStoredToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const isAuthenticated = () => {
  const token = getStoredToken();
  return isTokenValid(token);
};

/**
 * Demande une réinitialisation de mot de passe en envoyant un email
 * @param {string} email - L'adresse email de l'utilisateur
 * @returns {Promise<Object>} - Résultat de la demande
 */
export const requestPasswordReset = async (email) => {
  try {
    const response = await api.post(API_URL + 'forgot-password', { email });
    return response.data;
  } catch (error) {
    console.error('Password reset request error:', error);
    
    // Nous ne vérifions plus spécifiquement le code 404
    // car le serveur renvoie toujours 200 pour des raisons de sécurité
    
    if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') {
      throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion.');
    }
    
    throw new Error(error.response?.data?.message || 'Une erreur s\'est produite');
  }
};

/**
 * Valide un token de réinitialisation de mot de passe
 * @param {string} token - Le token de réinitialisation
 * @returns {Promise<Object>} - Résultat de la validation
 */
export const validateResetToken = async (token) => {
  try {
    const response = await api.get(`${API_URL}reset-password/validate?token=${encodeURIComponent(token)}`);
    return response.data;
  } catch (error) {
    console.error('Token validation error:', error);
    throw new Error(error.response?.data?.message || 'Token invalide ou expiré');
  }
};

/**
 * Réinitialise le mot de passe avec un token valide
 * @param {string} token - Le token de réinitialisation
 * @param {string} newPassword - Le nouveau mot de passe
 * @returns {Promise<Object>} - Résultat de la réinitialisation
 */
export const resetPassword = async (token, newPassword) => {
  try {
    const response = await api.post(API_URL + 'reset-password', {
      token,
      newPassword
    });
    return response.data;
  } catch (error) {
    console.error('Password reset error:', error);
    
    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.message || 'Le token est invalide ou a expiré');
    }
    
    throw new Error(error.response?.data?.message || 'Une erreur s\'est produite lors de la réinitialisation');
  }
};
