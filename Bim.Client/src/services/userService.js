import api from '../config/api.config';

export const userService = {  
  getAllUsers: async () => {
    try {
      // Pour l'affichage général, utiliser l'endpoint non-admin
      const response = await api.get('/api/collaborationtasks/available-users');
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      // Ensure we have an array of users
      if (!Array.isArray(response.data)) {
        // Try to extract data if it's wrapped in an object
        if (response.data.users && Array.isArray(response.data.users)) {
          return response.data.users;
        }
        if (response.data.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        throw new Error('Invalid response format from server');
      }
        // Ajouter des logs détaillés pour comprendre le format des données
      console.log('Format des données utilisateur reçues:', {
        data: response.data,
        firstUser: response.data[0],
        userCount: response.data.length,
        userIds: response.data.map(u => u.id),
        userRoles: response.data.map(u => ({email: u.email, roles: u.roles}))
      });
        return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Check for specific error types
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          throw new Error('Authentication required to fetch users');
        }
        if (error.response.status === 404) {
          throw new Error('Users endpoint not found');
        }
      }
      throw new Error('Failed to fetch users. Please try again.');
    }
  },
  
  // Méthode pour obtenir uniquement les utilisateurs actifs
  getActiveUsers: async () => {
    try {
      const allUsers = await userService.getAllUsers();
      // Filtrer pour ne garder que les utilisateurs actifs (si la propriété existe)
      return allUsers.filter(user => user.isActive !== false);
    } catch (error) {
      console.error('Error fetching active users:', error);
      return [];
    }
  },

  // Méthode pour créer ou mettre à jour un utilisateur
  saveUser: async (url, userData, isEdit = false) => {
    try {
      // First ensure token is configured correctly
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const tokenValue = token && (token.startsWith('Bearer ') ? token : `Bearer ${token}`);
      
      console.log(`${isEdit ? 'Updating' : 'Creating'} user with data:`, {
        endpoint: url,
        userEmail: userData.email,
        userRole: userData.role,
        hasToken: !!tokenValue
      });
      
      const method = isEdit ? 'put' : 'post';
      
      // Always set auth header explicitly for admin operations
      const headers = tokenValue ? { 'Authorization': tokenValue } : {};
      const response = await api[method](url, userData, { headers });
      
      return response;
    } catch (error) {
      console.error('Error saving user:', error);
      
      // Format error message
      let errorMessage = 'Failed to save user data';
      if (error.response) {
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 401 || error.response.status === 403) {
          errorMessage = 'You do not have permission to perform this operation';
        } else if (error.response.status === 400) {
          errorMessage = 'Invalid user data provided';
        }
        
        // Log detailed error for admin operations
        console.error('Admin operation failed:', {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data
        });
      }
      
      throw new Error(errorMessage);
    }
  },

  // Méthode spécifique pour obtenir les utilisateurs pour l'assignation de tâches
  getAssignableUsers: async () => {
    try {
      const response = await api.get('/api/collaborationtasks/available-users');
      
      if (!Array.isArray(response.data)) {
        console.error('Expected array but got:', response.data);
        throw new Error('Invalid response format');
      }

      console.log(`Retrieved ${response.data.length} assignable users:`, response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching assignable users:', error);
      if (error.response?.status === 401) {
        throw new Error('Please log in to access user list');
      }
      throw new Error('Failed to load users. Please try again.');
    }
  },

  // Nouvelle méthode spécifique pour l'administration des utilisateurs
  getAllUsersAdmin: async () => {
    try {
      // Utiliser l'endpoint admin qui retourne tous les détails y compris les rôles
      const response = await api.get('/api/users');
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      // Ensure we have an array of users
      if (!Array.isArray(response.data)) {
        if (response.data.users && Array.isArray(response.data.users)) {
          return response.data.users;
        }
        if (response.data.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        throw new Error('Invalid response format from server');
      }
      
      // Ajouter des logs détaillés pour comprendre le format des données
      console.log('Format des données utilisateur admin reçues:', {
        data: response.data,
        firstUser: response.data[0],
        userCount: response.data.length,
        userRoles: response.data.map(u => ({email: u.email, roles: u.Roles || u.roles}))
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching admin users:', error);
      
      // Check for specific error types
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          throw new Error('Autorisation administrateur requise pour accéder à cette ressource');
        }
      }
      throw new Error('Impossible de récupérer la liste des utilisateurs. Veuillez réessayer.');
    }
  },
};
