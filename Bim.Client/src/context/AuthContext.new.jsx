/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      console.log('AuthContext: Checking token:', token ? 'Token exists' : 'No token');

      if (!token) {
        console.log('AuthContext: Aucun token trouvé');
        setIsAuthenticated(false);
        setUserData(null);
        setIsLoading(false);
        return false;
      }

      // Configure axios with token
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      console.log('AuthContext: Vérification du token');
      
      // Verify token
      const response = await axios.get(`${API_BASE_URL}/api/auth/verify`);
      
      if (response.status === 200) {
        console.log('AuthContext: Token validé avec succès');
        
        // Get user data
        const userResponse = await axios.get(`${API_BASE_URL}/api/auth/me`);
        setUserData(userResponse.data);
        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      }

      throw new Error('Token verification failed');

    } catch (error) {
      console.error('AuthContext: Error during authentication check:', error);
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setIsAuthenticated(false);
      setUserData(null);
      setIsLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value = {
    isAuthenticated,
    setIsAuthenticated,
    userData,
    setUserData,
    checkAuth,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
