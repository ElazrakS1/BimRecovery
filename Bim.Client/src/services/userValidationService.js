import { apiCall } from './api';

/**
 * Service pour la validation et gestion des utilisateurs
 */
class UserValidationService {
  /**
   * Valide une liste d'utilisateurs avant assignation
   * @param {string[]} userIds - Liste des IDs utilisateurs à valider
   * @returns {Promise<Object>} Résultat de la validation
   */
  async validateUsersForAssignment(userIds) {
    try {
      if (!userIds || userIds.length === 0) {
        return {
          isValid: true,
          validUserIds: [],
          invalidUserIds: [],
          inactiveUserIds: [],
          userDetails: {},
          errorMessages: []
        };
      }

      // Obtenir tous les utilisateurs disponibles
      const availableUsers = await this.getAvailableUsers();
      const availableUserIds = availableUsers.map(user => user.id);
      
      const validUserIds = userIds.filter(id => availableUserIds.includes(id));
      const invalidUserIds = userIds.filter(id => !availableUserIds.includes(id));
      
      // Créer un map des détails utilisateurs
      const userDetails = {};
      availableUsers.forEach(user => {
        if (userIds.includes(user.id)) {
          userDetails[user.id] = {
            id: user.id,
            email: user.email || '',
            fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            isActive: true // Tous les utilisateurs disponibles sont actifs
          };
        }
      });

      const errorMessages = [];
      if (invalidUserIds.length > 0) {
        errorMessages.push(`Les utilisateurs suivants n'existent pas ou sont inactifs: ${invalidUserIds.join(', ')}`);
      }

      return {
        isValid: invalidUserIds.length === 0,
        validUserIds,
        invalidUserIds,
        inactiveUserIds: [], // Pas d'utilisateurs inactifs dans la liste disponible
        userDetails,
        errorMessages,
        hasValidUsers: validUserIds.length > 0,
        hasInvalidUsers: invalidUserIds.length > 0
      };
    } catch (error) {
      console.error('Erreur lors de la validation des utilisateurs:', error);
      return {
        isValid: false,
        validUserIds: [],
        invalidUserIds: userIds,
        inactiveUserIds: [],
        userDetails: {},
        errorMessages: ['Erreur lors de la validation des utilisateurs'],
        hasValidUsers: false,
        hasInvalidUsers: true
      };
    }
  }

  /**
   * Obtient la liste des utilisateurs disponibles pour assignation
   * @returns {Promise<Array>} Liste des utilisateurs disponibles
   */
  async getAvailableUsers() {
    try {
      // Essayer le premier endpoint
      try {
        console.log('Tentative de récupération des utilisateurs via /api/CollaborationTasks/users');
        const response = await apiCall('/api/CollaborationTasks/users', {
          method: 'GET'
        });
        
        if (response && Array.isArray(response) && response.length > 0) {
          console.log(`✅ Utilisateurs récupérés: ${response.length}`);
          return response;
        }
      } catch (firstError) {
        console.warn('Premier endpoint a échoué:', firstError);
      }
      
      // Essayer le second endpoint en cas d'échec
      console.log('Tentative de récupération via /api/collaborationtasks/available-users');
      const fallbackResponse = await apiCall('/api/collaborationtasks/available-users', {
        method: 'GET'
      });
      
      if (fallbackResponse && Array.isArray(fallbackResponse)) {
        console.log(`✅ Utilisateurs récupérés (fallback): ${fallbackResponse.length}`);
        return fallbackResponse;
      }
      
      // Si tout échoue, chercher dans userService
      console.log('Tentative de récupération via userService');
      try {
        const { userService } = await import('./userService');
        const serviceUsers = await userService.getAssignableUsers();
        if (serviceUsers && Array.isArray(serviceUsers)) {
          console.log(`✅ Utilisateurs récupérés (service): ${serviceUsers.length}`);
          return serviceUsers;
        }
      } catch (serviceError) {
        console.warn('userService a échoué:', serviceError);
      }
      
      // En dernier recours, retourner des utilisateurs fictifs pour le développement
      return this.getMockUsers();
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      return this.getMockUsers(); // Retourner des utilisateurs fictifs en cas d'erreur
    }
  }

  /**
   * Valide un utilisateur spécifique
   * @param {string} userId - ID de l'utilisateur à valider
   * @returns {Promise<Object>} Résultat de la validation pour un utilisateur
   */
  async validateSingleUser(userId) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return {
        isValid: false,
        userExists: false,
        userActive: false,
        userDetails: null,
        errorMessage: 'ID utilisateur invalide'
      };
    }

    const validationResult = await this.validateUsersForAssignment([userId]);
    const userDetails = validationResult.userDetails[userId];
    
    return {
      isValid: validationResult.validUserIds.includes(userId),
      userExists: !!userDetails,
      userActive: userDetails?.isActive || false,
      userDetails,
      errorMessage: validationResult.errorMessages[0] || null
    };
  }

  /**
   * Génère des suggestions pour résoudre les problèmes d'assignation
   * @param {Object} validationResult - Résultat de la validation
   * @returns {Array<string>} Liste de suggestions
   */
  getAssignmentSuggestions(validationResult) {
    const suggestions = [];
    
    if (validationResult.hasInvalidUsers) {
      suggestions.push('Vérifiez que les utilisateurs sélectionnés existent et sont actifs');
      suggestions.push('Actualisez la liste des utilisateurs disponibles');
    }
    
    if (validationResult.hasValidUsers) {
      suggestions.push(`Vous pouvez continuer avec seulement les ${validationResult.validUserIds.length} utilisateur(s) valide(s)`);
    } else {
      suggestions.push('Sélectionnez des utilisateurs dans la liste des utilisateurs disponibles');
    }
    
    return suggestions;
  }

  /**
   * Filtre les utilisateurs valides d'une liste
   * @param {string[]} userIds - Liste des IDs utilisateurs
   * @returns {Promise<string[]>} Liste des IDs utilisateurs valides
   */
  async filterValidUsers(userIds) {
    const validationResult = await this.validateUsersForAssignment(userIds);
    return validationResult.validUserIds;
  }

  /**
   * Formate les informations d'un utilisateur pour l'affichage
   * @param {Object} user - Objet utilisateur
   * @returns {string} Texte formaté pour l'affichage
   */
  formatUserForDisplay(user) {
    if (!user) return 'Utilisateur inconnu';
    
    const name = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const email = user.email ? ` (${user.email})` : '';
    
    return `${name}${email}` || user.id;
  }

  /**
   * Affiche une notification d'erreur de validation pour l'utilisateur
   * @param {Object} validationResult - Résultat de la validation
   * @param {Function} showNotification - Fonction d'affichage de notification
   */
  showValidationError(validationResult, showNotification) {
    if (!validationResult || validationResult.isValid) return;
    
    const message = validationResult.errorMessages.join('\n') || 'Erreur de validation des utilisateurs';
    const suggestions = this.getAssignmentSuggestions(validationResult);
    
    if (showNotification) {
      showNotification({
        type: 'error',
        title: 'Erreur d\'assignation',
        message: message,
        details: suggestions.length > 0 ? 'Suggestions:\n' + suggestions.join('\n') : null,
        duration: 10000 // 10 secondes pour laisser le temps de lire
      });
    }
  }

  /**
   * Générer des utilisateurs fictifs pour le développement
   * @returns {Array} Utilisateurs fictifs
   */
  getMockUsers() {
    console.log('⚠️ Utilisation des utilisateurs fictifs');
    return [
      { id: 'dev-user-1', email: 'admin@example.com', firstName: 'Admin', lastName: 'User' },
      { id: 'dev-user-2', email: 'dev@example.com', firstName: 'Developer', lastName: 'Test' },
      { id: 'dev-user-3', email: 'manager@example.com', firstName: 'Project', lastName: 'Manager' },
      { id: 'dev-user-4', email: 'designer@example.com', firstName: 'UI/UX', lastName: 'Designer' },
      { id: 'dev-user-5', email: 'client@example.com', firstName: 'Client', lastName: 'User' }
    ];
  }
}

// Créer une instance du service
const userValidationService = new UserValidationService();

export default userValidationService;

// Export de la classe pour les tests ou instances personnalisées
export { UserValidationService };
