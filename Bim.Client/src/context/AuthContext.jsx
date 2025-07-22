import { createContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api.config';
import { setAuthToken } from '../services/authService';
import api from '../config/api.config';

// Create the auth context with some defaults
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const parseToken = useCallback((token) => {
    try {
      // Remove Bearer prefix if present
      const actualToken = token.startsWith('Bearer ') ? token.substring(7) : token;
      
      // Parse JWT token
      const base64Url = actualToken.split('.')[1];
      if (!base64Url) {
        throw new Error('Invalid token format');
      }
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const parsedToken = JSON.parse(jsonPayload);
      console.log('Token claims:', parsedToken);
      return parsedToken;
    } catch (error) {
      console.error('Token parsing error:', error);
      return null;
    }
  }, []);
  const normalizeRoles = useCallback((userInfo) => {
    // Extract roles from various possible sources
    const roles = new Set();

    // Check roles array
    if (Array.isArray(userInfo.roles)) {
      userInfo.roles.forEach(role => roles.add(role));
    }

    // Check role property
    if (userInfo.role) {
      roles.add(userInfo.role);
    }

    // Check userRoles array
    if (Array.isArray(userInfo.userRoles)) {
      userInfo.userRoles.forEach(role => roles.add(role));
    }

    // Check token claims for roles
    if (userInfo.claims) {
      const roleClaims = userInfo.claims.filter(claim => 
        claim.type === 'role' || 
        claim.type === 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
      );
      roleClaims.forEach(claim => roles.add(claim.value));
    }

    // Check roleNames if provided by API
    if (Array.isArray(userInfo.roleNames)) {
      userInfo.roleNames.forEach(role => roles.add(role));
    }

    // Check for isAdmin property explicitly
    if (userInfo.isAdmin === true) {
      roles.add('Admin');
    }

    console.log('Roles extraits de toutes les sources:', Array.from(roles));
    
    // Convert Set back to array
    return Array.from(roles);
  }, []);
  const fetchUserData = useCallback(async (token) => {
    try {
      if (!token) {
        throw new Error('No token provided for fetchUserData');
      }

      console.log('Fetching user data with token:', token.substring(0, 20) + '...');

      const response = await api.get(`${API_BASE_URL}/api/Auth/me`, {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`
        }
      });

      if (!response.data) {
        throw new Error('No user data received');
      }      const userInfo = response.data;
      console.log('Raw user data received:', userInfo);
      
      // Normalize roles
      userInfo.roles = normalizeRoles(userInfo);
      console.log('Normalized roles:', userInfo.roles);

      // Detect admin status using case-insensitive comparison
      const hasAdminRole = userInfo.roles.some(role => 
        typeof role === 'string' && role.toLowerCase() === 'admin'
      );
      console.log('Setting admin status:', hasAdminRole);
        // Store admin status explicitly in the user object for easier access
      userInfo.isAdmin = hasAdminRole;

      setUserData(userInfo);
      setIsAdmin(hasAdminRole);

      return userInfo;
    } catch (error) {
      console.error('Error fetching user data:', error);
      // En cas d'erreur 401/403, nettoyer l'état d'authentification
      if (error.response?.status === 401 || error.response?.status === 403) {
        setIsAuthenticated(false);
        setUserData(null);
        setIsAdmin(false);
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      }
      throw error;
    }
  }, [normalizeRoles]);
  // Retry mechanism with exponential backoff
  const retryWithBackoff = useCallback(async (fn, retries = 3, delay = 500) => {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      
      console.log(`AuthContext: Retry attempt, ${retries} retries left. Waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      console.log('AuthContext: Vérification de l\'authentification...', new Date().toISOString());
      
      if (!token) {
        console.log('AuthContext: Aucun token trouvé');
        setIsAuthenticated(false);
        setUserData(null);
        setIsAdmin(false);
        setIsLoading(false);
        return false;
      }
      
      // Add auth check debounce
      if (window._authCheckInProgress) {
        console.log('AuthContext: Vérification déjà en cours, requête ignorée');
        return false;
      }
      
      window._authCheckInProgress = true;

      // Parse and validate token
      const decodedToken = parseToken(token);
      if (!decodedToken) {
        console.log('AuthContext: Format de token invalide');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        setIsAuthenticated(false);
        setUserData(null);
        setIsAdmin(false);
        setIsLoading(false);
        return false;
      }
      
      // Vérification préliminaire des rôles dans le token
      if (decodedToken.role === 'Admin' || 
          (Array.isArray(decodedToken.roles) && decodedToken.roles.some(r => r === 'Admin')) ||
          decodedToken.isAdmin === true) {
        console.log('AuthContext: Token contient un rôle Admin');
      }

      // Check token expiration
      if (decodedToken.exp && decodedToken.exp * 1000 < Date.now()) {
        console.log('AuthContext: Token expired');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        setIsAuthenticated(false);
        setUserData(null);
        setIsAdmin(false);
        setIsLoading(false);
        return false;
      }      try {
        // Use retry mechanism for API call
        const userInfo = await retryWithBackoff(() => fetchUserData(token), 2, 500);

        // Ensure isAdmin flag is set consistently on the user data
        const hasAdminRole = userInfo.roles.some(role => 
          typeof role === 'string' && role.toLowerCase() === 'admin'
        );
        userInfo.isAdmin = hasAdminRole;
        
        setIsAuthenticated(true);
        setUserData(userInfo);
        setIsAdmin(hasAdminRole);
        setIsLoading(false);

        // Log pour le débogage
        console.log('AuthContext: User data updated', {
          id: userInfo.id,
          email: userInfo.email,
          roles: userInfo.roles,
          isAdmin: hasAdminRole
        });
        
        window._authCheckInProgress = false;
        return true;
      } catch (error) {
        console.error('Error verifying authentication:', error);
        
        // Specific error handling based on error type
        if (error.response) {
          console.log(`AuthContext: Server responded with status ${error.response.status}`);
          
          if (error.response.status === 401 || error.response.status === 403) {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
          }
          
          if (error.response.status >= 500) {
            console.error('AuthContext: Server error - might retry later');
          }
        } else if (error.request) {
          console.error('AuthContext: No response from server - network issue');
        }
        
        setIsAuthenticated(false);
        setUserData(null);
        setIsAdmin(false);
        setIsLoading(false);
        
        window._authCheckInProgress = false;
        return false;
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      setIsAuthenticated(false);
      setUserData(null);
      setIsAdmin(false);
      setIsLoading(false);
      
      window._authCheckInProgress = false;
      return false;
    }
  }, [parseToken, fetchUserData]);

  // Effectuer la vérification d'authentification au montage du composant
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value = {
    isAuthenticated,
    setIsAuthenticated,
    userData,
    setUserData,
    checkAuth,
    isLoading,
    isAdmin,    refreshUserData: async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        try {
          // Make sure our API client has the token set
          setAuthToken(token);
          return fetchUserData(token);
        } catch (error) {
          console.error('Error refreshing user data:', error);
          return null;
        }
      }
      return null;
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };