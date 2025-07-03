import { useState, useCallback, useEffect } from 'react';
import userValidationService from '../services/userValidationService';

/**
 * Hook React pour la validation des utilisateurs dans les assignations
 */
const useUserValidation = () => {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastValidation, setLastValidation] = useState(null);

  // Charger les utilisateurs disponibles au montage du composant
  useEffect(() => {
    loadAvailableUsers();
  }, []);

  /**
   * Charge la liste des utilisateurs disponibles
   */
  const loadAvailableUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Premier essai avec le service de validation
      let users = await userValidationService.getAvailableUsers();
      
      // Fallback si aucun utilisateur n'est trouvé
      if (!users || users.length === 0) {
        console.log('Aucun utilisateur trouvé via userValidationService, essai avec userService...');
        try {
          const { userService } = await import('../services/userService');
          users = await userService.getAssignableUsers();
          console.log(`Utilisateurs via userService: ${users?.length || 0}`);
        } catch (fallbackError) {
          console.error('Erreur lors du fallback sur userService:', fallbackError);
        }
      }
      
      // Si toujours rien, essayer getAllUsers comme dernier recours
      if (!users || users.length === 0) {
        console.log('Dernier essai avec getAllUsers...');
        try {
          const { userService } = await import('../services/userService');
          users = await userService.getAllUsers();
          console.log(`Utilisateurs via getAllUsers: ${users?.length || 0}`);
        } catch (lastError) {
          console.error('Erreur lors du dernier recours:', lastError);
        }
      }
      
      // Même si la liste est vide, on la met à jour
      console.log(`Total utilisateurs chargés: ${users?.length || 0}`);
      setAvailableUsers(users || []);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      setAvailableUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Valide une liste d'utilisateurs
   * @param {string[]} userIds - Liste des IDs utilisateurs à valider
   * @returns {Promise<Object>} Résultat de la validation
   */
  const validateUsers = useCallback(async (userIds) => {
    const validationResult = await userValidationService.validateUsersForAssignment(userIds);
    setLastValidation(validationResult);
    return validationResult;
  }, []);

  /**
   * Valide et filtre les utilisateurs valides
   * @param {string[]} userIds - Liste des IDs utilisateurs
   * @returns {Promise<string[]>} Liste des IDs utilisateurs valides
   */
  const getValidUsers = useCallback(async (userIds) => {
    const validationResult = await validateUsers(userIds);
    return validationResult.validUserIds;
  }, [validateUsers]);

  /**
   * Vérifie si un utilisateur existe et est actif
   * @param {string} userId - ID de l'utilisateur à vérifier
   * @returns {Promise<boolean>} True si l'utilisateur est valide
   */
  const isUserValid = useCallback(async (userId) => {
    const validationResult = await userValidationService.validateSingleUser(userId);
    return validationResult.isValid;
  }, []);

  /**
   * Obtient les détails d'un utilisateur par son ID
   * @param {string} userId - ID de l'utilisateur
   * @returns {Object|null} Détails de l'utilisateur ou null
   */
  const getUserDetails = useCallback((userId) => {
    return availableUsers.find(user => user.id === userId) || null;
  }, [availableUsers]);

  /**
   * Formate un utilisateur pour l'affichage dans un dropdown
   * @param {Object} user - Objet utilisateur
   * @returns {string} Texte formaté
   */
  const formatUserForDropdown = useCallback((user) => {
    if (!user) return 'Utilisateur inconnu';
    
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const email = user.email ? ` (${user.email})` : '';
    
    return `${name}${email}` || user.id;
  }, []);

  /**
   * Filtre les utilisateurs disponibles selon une recherche
   * @param {string} searchTerm - Terme de recherche
   * @returns {Array} Liste des utilisateurs filtrés
   */
  const filterUsers = useCallback((searchTerm) => {
    if (!searchTerm) return availableUsers;
    
    const term = searchTerm.toLowerCase();
    return availableUsers.filter(user => {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      const email = (user.email || '').toLowerCase();
      const company = (user.company || '').toLowerCase();
      
      return fullName.includes(term) || 
             email.includes(term) || 
             company.includes(term);
    });
  }, [availableUsers]);

  /**
   * Obtient les suggestions pour résoudre les erreurs de validation
   * @param {Object} validationResult - Résultat de la validation
   * @returns {Array<string>} Liste de suggestions
   */
  const getValidationSuggestions = useCallback((validationResult) => {
    return userValidationService.getAssignmentSuggestions(validationResult);
  }, []);

  /**
   * Vérifie si tous les utilisateurs d'une liste sont valides
   * @param {string[]} userIds - Liste des IDs utilisateurs
   * @returns {Promise<boolean>} True si tous les utilisateurs sont valides
   */
  const areAllUsersValid = useCallback(async (userIds) => {
    if (!userIds || userIds.length === 0) return true;
    
    const validationResult = await validateUsers(userIds);
    return validationResult.isValid;
  }, [validateUsers]);

  /**
   * Nettoie une liste d'utilisateurs en retirant les invalides
   * @param {string[]} userIds - Liste des IDs utilisateurs
   * @param {boolean} showWarning - Afficher un avertissement si des utilisateurs sont retirés
   * @returns {Promise<string[]>} Liste nettoyée des IDs utilisateurs
   */
  const cleanUserList = useCallback(async (userIds, showWarning = true) => {
    const validationResult = await validateUsers(userIds);
    
    if (showWarning && validationResult.hasInvalidUsers) {
      console.warn(
        'Utilisateurs invalides retirés de la liste:', 
        validationResult.invalidUserIds
      );
    }
    
    return validationResult.validUserIds;
  }, [validateUsers]);

  return {
    // État
    availableUsers,
    loading,
    lastValidation,
    
    // Actions
    loadAvailableUsers,
    validateUsers,
    getValidUsers,
    isUserValid,
    areAllUsersValid,
    cleanUserList,
    
    // Utilitaires
    getUserDetails,
    formatUserForDropdown,
    filterUsers,
    getValidationSuggestions,
    
    // Raccourcis pour les propriétés de validation courantes
    hasValidUsers: lastValidation?.hasValidUsers || false,
    hasInvalidUsers: lastValidation?.hasInvalidUsers || false,
    validationErrors: lastValidation?.errorMessages || [],
    isLastValidationValid: lastValidation?.isValid || true
  };
};

export default useUserValidation;
