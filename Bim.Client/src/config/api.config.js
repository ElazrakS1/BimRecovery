import axios from 'axios';

export const API_BASE_URL = (() => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:5258';
  // Ensure URL doesn't end with a slash
  return url.endsWith('/') ? url.slice(0, -1) : url;
})();
export const API_TIMEOUT = 30000; // 30 seconds for general requests
export const LOGIN_TIMEOUT = 10000; // 10 seconds for login
export const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds for health checks

// Track connection state
let isRefreshing = false;
let failedQueue = [];
let isConnected = false;

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

// Enhanced API availability check with better error handling
const checkApiAvailability = async () => {
  const endpoints = [
    { url: '/api/health', method: 'GET' },  // Health check endpoint
    { url: '/api', method: 'GET' },         // Base API endpoint
    { url: '/api/auth', method: 'GET' }     // Auth endpoint
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        url: `${API_BASE_URL}${endpoint.url}`,
        method: endpoint.method,
        timeout: HEALTH_CHECK_TIMEOUT,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        validateStatus: (status) => status < 500 || status === 404  // Accept 404 for missing endpoints
      });

      // Any response (including 404) means the API is up
      isConnected = true;
      if (import.meta.env.DEV) {
        console.log(`API check ${endpoint.url}: ${response.status} ${response.statusText}`);
      }
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug(`Endpoint ${endpoint.url} check failed:`, {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
      }
    }
  }
  
  isConnected = false;
  console.warn('API not available - all endpoint checks failed');
  return false;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true, // Enable sending cookies with requests
  maxRedirects: 5,
  validateStatus: status => {
    return (status >= 200 && status < 300) || status === 304;
  }
});

// Initial health check
checkApiAvailability();

// Response interceptor with improved error handling
api.interceptors.response.use(
  (response) => {
    // Remove all policy-related headers from the response
    if (response.headers) {
      const headersToRemove = [
        'permission-policy',
        'permissions-policy',
        'feature-policy',
        'document-policy',
        'cross-origin-embedder-policy',
        'cross-origin-opener-policy',
        'cross-origin-resource-policy'
      ];
      
      headersToRemove.forEach(header => {
        delete response.headers[header.toLowerCase()];
      });
    }
    
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`API Response [${response.status}]: ${response.config.url}`, {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        timestamp: new Date().toISOString()
      });
    }
    
    return response;
  },
  (error) => {
    // Enhanced error logging
    if (import.meta.env.DEV) {
      console.error(`API Error [${error.response?.status || 'Network'}]: ${error.config?.url || 'Unknown URL'}`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    // Handle specific error cases
    if (error.response?.status === 500) {
      console.error('Server error details:', {
        endpoint: error.config?.url,
        method: error.config?.method,
        responseData: error.response?.data,
        headers: error.config?.headers,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });

      // If this is a proxy error, try to recover
      if (error.config?.url?.includes('html-proxy')) {
        console.log('Detected proxy error, attempting recovery...');
        return new Promise(resolve => {
          // Small delay before retry
          setTimeout(() => {
            resolve(api(error.config));
          }, 1000);
        });
      }
      
      // Try to recover from 500 errors that might be auth-related
      if (error.response?.data?.message?.toLowerCase().includes('auth') || 
          error.response?.data?.message?.toLowerCase().includes('token')) {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
          const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          api.defaults.headers.common['Authorization'] = tokenValue;
          // Retry the request with the reapplied token
          return api(error.config);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Add request interceptor with improved timeout handling
api.interceptors.request.use(
  async (config) => {
    // Adjust timeout based on endpoint
    if (config.url?.includes('/auth/login')) {
      config.timeout = LOGIN_TIMEOUT;
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    let tokenValue = null;
    
    if (token) {
      // Ensure proper format "Bearer <token>"
      tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      config.headers.Authorization = tokenValue;
    }
    
    // Handle special endpoints
    const isAdminEndpoint = 
      (config.url?.includes('/api/users') && config.method !== 'GET') || 
      config.url?.includes('/api/auth/register') ||
      config.url?.includes('/admin');
    
    // Log the request for debugging (only in development)
    if (import.meta.env.DEV) {
      const logData = {
        baseURL: config.baseURL,
        timeout: config.timeout,
        headers: {
          Authorization: token ? 'Bearer <token-hidden>' : 'None',
          ...config.headers
        }
      };

      if (token) {
        Object.assign(logData, {
          path: config.url.replace(API_BASE_URL, ''),
          isAdminEndpoint,
          hasAuthHeader: !!config.headers.Authorization,
          tokenStart: tokenValue ? `${tokenValue.substring(0, 15)}...` : 'None'
        });
      }

      console.log(`API Request [${config.method?.toUpperCase()}]: ${config.url}`, logData);
    } else {
      // Verify if this is a public endpoint that doesn't require authentication
      const isPublicEndpoint = 
        config.url?.includes('/api/auth/login') ||
        config.url?.includes('/api/auth/forgot-password') ||
        config.url?.includes('/api/auth/reset-password') ||
        config.url?.includes('/api/public');
      
      // Only show warning if endpoint is not public
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
    
    // If this is a network error, we can try to ensure the token is still properly set
    if (error.message && (error.message.includes('Network Error') || !error.response)) {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        // Re-ensure token is set in the api defaults
        const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        api.defaults.headers.common['Authorization'] = tokenValue;
        console.log('⚠️ Network error detected - reapplied token to defaults');
      }
    }
    
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

        // Create a special axios instance just for token verification to avoid interceptor loops
        const verifyAxios = axios.create({
          baseURL: API_BASE_URL,
          timeout: API_TIMEOUT
        });

        try {
          // First try the standard token verification endpoint
          const verifyResponse = await verifyAxios.get('/api/auth/verify', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (verifyResponse.status === 200) {
            // Token is still valid, retry original request
            const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            originalRequest.headers.Authorization = tokenValue;
            processQueue(null, tokenValue);
            return api(originalRequest);
          }
        } catch (standardVerifyError) {
          console.log('Standard token verification failed, trying alternative endpoints...');
          
          // Try alternative endpoints for token validation
          try {
            // Try user profile endpoint as an alternative verification
            const userResponse = await verifyAxios.get('/api/users/profile', {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (userResponse.status === 200) {
              // Token is valid if we can get profile
              const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
              originalRequest.headers.Authorization = tokenValue;
              processQueue(null, tokenValue);
              return api(originalRequest);
            }
          } catch (alternativeVerifyError) {
            // All verification methods failed
            throw new Error('Token verification failed');
          }
        }
      } catch (verifyError) {
        // Token verification failed
        console.error('❌ Token verification failed completely:', verifyError.message);
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
const initializeApiToken = async () => {
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

      // Set up the token anyway, even if API is not available
      api.defaults.headers.common['Authorization'] = tokenValue;
      
      // Try to verify the token silently, but don't fail if we can't
      try {
        const verifyAxios = axios.create({
          baseURL: API_BASE_URL,
          timeout: 5000, // Shorter timeout for verification
          headers: {
            'Authorization': tokenValue,
            'Accept': 'application/json'
          }
        });

        await verifyAxios.get('/api/auth/verify');
        console.log('Token verified successfully');
        return true;
      } catch (verifyError) {
        console.warn('Token verification failed during initialization:', verifyError.message);
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('Error initializing API token:', error);
    return false;
  }
};

// Run initialization
initializeApiToken();

export default api;
