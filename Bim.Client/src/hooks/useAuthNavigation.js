import { useNavigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Hook personnalisé pour gérer la navigation entre les pages d'authentification
 */
const useAuthNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useContext(AuthContext);

  /**
   * Navigue vers la page de mot de passe oublié
   */
  const goToForgotPassword = () => {
    // Utiliser replace: true pour éviter les problèmes de navigation en arrière
    navigate('/forgot-password', { replace: true });
  };

  /**
   * Navigue vers la page de connexion
   */
  const goToLogin = () => {
    navigate('/login', { replace: true });
  };

  /**
   * Navigue vers la page de réinitialisation de mot de passe
   * @param {string} token - Le token de réinitialisation
   */
  const goToResetPassword = (token) => {
    navigate(`/reset-password/${token}`, { replace: true });
  };

  /**
   * Navigue vers la page d'accueil ou la page précédente après connexion
   */
  const goToHomeOrPrevious = () => {
    const redirectPath = location.state?.from || '/';
    navigate(redirectPath, { replace: true });
  };

  return {
    goToForgotPassword,
    goToLogin,
    goToResetPassword,
    goToHomeOrPrevious,
    isAuthenticated
  };
};

export default useAuthNavigation;
