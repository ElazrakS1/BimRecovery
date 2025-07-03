import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5258';
export const API_TIMEOUT = 30000; // 30 seconds

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Remove problematic Permission-Policy headers
api.interceptors.response.use(
  (response) => {
    // Remove any Permission-Policy headers from the response
    if (response.headers) {
      delete response.headers['permission-policy'];
    }
    return response;
  },
  (error) => Promise.reject(error)
);

// Add request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      // Ensure proper format "Bearer <token>"
      const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      config.headers.Authorization = tokenValue;
        // Detect if this is an admin endpoint
      const isAdminEndpoint = 
        (config.url.includes('/api/users') && config.method !== 'GET') || 
        config.url.includes('/api/auth/register') ||
        config.url.includes('/admin');
      
      // Log for debugging auth issues
      console.log('🔑 API Request with token:', {
        url: config.url,
        method: config.method,
        path: config.url.replace(API_BASE_URL, ''),
        isAdminEndpoint,
        hasAuthHeader: !!config.headers.Authorization,
        tokenStart: tokenValue.substring(0, 15) + '...'
      });
    } else {
      // Vérifier si l'endpoint est une route publique qui ne nécessite pas d'authentification
      const isPublicEndpoint = 
        config.url.includes('/api/auth/login') ||
        config.url.includes('/api/auth/forgot-password') ||
        config.url.includes('/api/auth/reset-password') ||
        config.url.includes('/api/public');
      
      // N'afficher l'avertissement que si l'endpoint n'est pas public
      if (!isPublicEndpoint) {
        console.log('⚠️ API Request without token:', {
          url: config.url,
          method: config.method
        });
      }
    }
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (!error.response) {
      return Promise.reject(error);
    }

    // Handle 401 errors
    if (error.response.status === 401) {
      if (originalRequest._retry || originalRequest.url.includes('/auth/login')) {
        // Clear tokens and redirect to login if:
        // 1. We've already tried to retry the request
        // 2. The failed request was the login attempt itself
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        
        // Store current path for redirect after login if not already on login page
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login')) {
          sessionStorage.setItem('redirectAfterLogin', currentPath);
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        try {
          const token = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          originalRequest.headers.Authorization = token;
          return api(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to verify the current token
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          throw new Error('No token available');
        }

        const verifyResponse = await api.get('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (verifyResponse.status === 200) {
          // Token is still valid, retry original request
          originalRequest.headers.Authorization = `Bearer ${token}`;
          processQueue(null, `Bearer ${token}`);
          return api(originalRequest);
        }
      } catch (verifyError) {
        // Token verification failed
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        processQueue(verifyError, null);

        // Redirect to login
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login')) {
          sessionStorage.setItem('redirectAfterLogin', currentPath);
          window.location.href = '/login';
        }
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Initialize API with token from storage on load
const initializeApiToken = () => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      api.defaults.headers.common['Authorization'] = tokenValue;
      
      // Check for admin API endpoints
      const isAdminRole = token && token.includes('role') && token.toLowerCase().includes('admin');
      
      console.log('API token initialized:', {
        tokenSet: !!tokenValue,
        potentialAdmin: isAdminRole
      });
    }
  } catch (error) {
    console.error('Error initializing API token:', error);
  }
};

// Run initialization
initializeApiToken();

export default api;
