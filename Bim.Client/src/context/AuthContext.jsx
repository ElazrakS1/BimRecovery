import { createContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api.config';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  
  const checkAuth = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      setUserData(null);
      return;
    }
    
    try {
      // Vérifier le token
      const authResponse = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!authResponse.ok) {
        // Si le token est invalide, nettoyer le stockage et déconnecter l'utilisateur
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        setIsAuthenticated(false);
        setUserData(null);
        throw new Error('Token invalide');
      }

      // Récupérer les informations de l'utilisateur
      const userResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        throw new Error('Échec de la récupération des données utilisateur');
      }

      const userData = await userResponse.json();
      setUserData(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      setIsAuthenticated(false);
      setUserData(null);
      // Ne pas propager l'erreur, gérer silencieusement l'échec d'authentification
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      setIsAuthenticated, 
      userData, 
      setUserData,
      checkAuth 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
