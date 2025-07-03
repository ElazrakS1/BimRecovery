import api, { API_BASE_URL } from '../config/api.config';
import { processIfcFile, uploadIFCFile } from './ifcService';

// Clé utilisée pour stocker l'historique des opérations dans le localStorage
const OPERATION_HISTORY_KEY = 'bim_operation_history';

/**
 * Récupère l'historique des opérations stocké localement
 * @returns {Array} - L'historique des opérations
 */
const getLocalOperationHistory = () => {
  try {
    const storedHistory = localStorage.getItem(OPERATION_HISTORY_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique local:', error);
    return [];
  }
};

/**
 * Sauvegarde l'historique des opérations dans le stockage local
 * @param {Array} history - L'historique des opérations à sauvegarder
 */
const saveLocalOperationHistory = (history) => {
  try {
    localStorage.setItem(OPERATION_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'historique local:', error);
  }
};

/**
 * Ajoute une nouvelle opération à l'historique local
 * @param {Object} operation - L'opération à ajouter
 */
const addOperationToHistory = (operation) => {
  const history = getLocalOperationHistory();
  // Générer un ID unique si nécessaire
  const newOperation = {
    ...operation,
    id: operation.id || Date.now(),
    date: operation.date || new Date().toISOString()
  };
  
  // Ajouter au début pour que les plus récentes apparaissent en premier
  history.unshift(newOperation);
  
  // Limiter la taille de l'historique (optionnel)
  const limitedHistory = history.slice(0, 50);
  
  saveLocalOperationHistory(limitedHistory);
  return newOperation;
};

/**
 * Service pour gérer les fonctionnalités d'interopérabilité et d'intégration
 */
export const integrationService = {
  /**
   * Importe des données depuis une source externe
   * @param {Object} importData - Les données pour l'importation
   * @returns {Promise<Object>} - Le résultat de l'importation
   */
  importData: async (importData) => {
    try {
      console.log('🔄 Début de l\'importation avec les données:', importData);
      
      // Si c'est un fichier IFC, utiliser notre processeur IFC client
      if (importData.file && 
         (importData.format === 'ifc2x3' || importData.format === 'ifc4') && 
         (importData.file.name.endsWith('.ifc') || importData.file.name.endsWith('.ifcXML'))) {
        
        // Traiter le fichier IFC localement d'abord
        console.log('📊 Traitement local du fichier IFC:', importData.file.name);
        const ifcResult = await processIfcFile(importData.file);
        
        if (!ifcResult.success) {
          throw new Error(ifcResult.error || 'Échec du traitement du fichier IFC');
        }
        
        // Ensuite, télécharger le fichier sur le serveur si nécessaire
        let uploadResult = null;
        try {
          uploadResult = await uploadIFCFile(importData.file);
          console.log('📤 Résultat du téléchargement:', uploadResult);
        } catch (uploadError) {
          console.warn('⚠️ Le téléchargement du fichier IFC a échoué, mais le traitement local a réussi:', uploadError);
        }
        
        // Ajouter l'opération à l'historique local
        const historyEntry = addOperationToHistory({
          type: 'import',
          source: importData.file.name,
          format: importData.format,
          status: 'success',
          user: localStorage.getItem('userName') || 'Utilisateur actuel',
          details: {
            elements: ifcResult.metadata.totalElements,
            properties: Object.keys(ifcResult.metadata.entityCounts).length,
            projectName: ifcResult.metadata.projectName || 'Inconnu',
            stats: ifcResult.metadata.stats || {}
          }
        });
        
        // Retourner les résultats combinés
        return {
          success: true,
          message: 'Import réussi',
          source: 'client',
          data: {
            ...ifcResult.metadata,
            elements: ifcResult.metadata.totalElements,
            properties: Object.keys(ifcResult.metadata.entityCounts).length,
            warnings: 0,
            serverFileId: uploadResult?.fileId,
            operationId: historyEntry.id
          }
        };
      }
      
      // Pour les autres formats ou sources, utiliser le processus existant
      const formData = new FormData();
      if (importData.file) {
        formData.append('file', importData.file);
      }
      
      formData.append('format', importData.format);
      formData.append('sourceType', importData.sourceType);
      formData.append('validateGeometry', importData.options.validateGeometry);
      formData.append('importProperties', importData.options.importProperties);
      
      if (importData.url) {
        formData.append('url', importData.url);
      }

      // Pour simuler l'API si elle n'existe pas encore
      if (process.env.NODE_ENV === 'development' && !process.env.USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Délai artificiel
        
        // Pour les simulations, ajouter aussi à l'historique
        const historyEntry = addOperationToHistory({
          type: 'import',
          source: importData.file?.name || importData.url || 'Source externe',
          format: importData.format,
          status: 'success',
          user: localStorage.getItem('userName') || 'Utilisateur actuel',
          details: {
            elements: 156,
            properties: 892,
            warnings: 3
          }
        });
        
        return {
          success: true,
          message: 'Import simulé réussi',
          source: 'simulated',
          data: {
            elements: 156,
            properties: 892,
            warnings: 3,
            operationId: historyEntry.id
          }
        };
      }

      const response = await api.post('/api/integration/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Si la réponse du serveur est un succès, ajouter à l'historique local
      if (response.data.success) {
        const historyEntry = addOperationToHistory({
          type: 'import',
          source: importData.file?.name || importData.url || 'API',
          format: importData.format,
          status: 'success',
          user: localStorage.getItem('userName') || 'Utilisateur actuel',
          details: response.data.data || {}
        });
        
        response.data.data = {
          ...response.data.data,
          operationId: historyEntry.id
        };
      }

      return {
        ...response.data,
        source: 'server'
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'importation:', error);
      
      // Ajouter l'erreur à l'historique local
      addOperationToHistory({
        type: 'import',
        source: importData.file?.name || importData.url || 'Source inconnue',
        format: importData.format,
        status: 'failed',
        user: localStorage.getItem('userName') || 'Utilisateur actuel',
        error: error.message || 'Erreur inconnue'
      });
      
      throw new Error(error.response?.data?.message || error.message || 'Échec de l\'importation');
    }
  },

  /**
   * Exporte des données vers une destination externe
   * @param {Object} exportData - Les données pour l'exportation
   * @returns {Promise<Object>} - Le résultat de l'exportation
   */
  exportData: async (exportData) => {
    try {
      console.log('🔄 Début de l\'exportation avec les données:', exportData);

      // Pour simuler l'API si elle n'existe pas encore
      if (process.env.NODE_ENV === 'development' && !process.env.USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 1800)); // Délai artificiel
        
        if (exportData.target === 'file') {
          // Simuler un téléchargement de fichier
          const fileName = `export_${new Date().getTime()}.${exportData.format}`;
          const blob = new Blob(['Contenu simulé du fichier'], { type: 'text/plain' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          // Ajouter l'opération à l'historique local
          const historyEntry = addOperationToHistory({
            type: 'export',
            destination: fileName,
            format: exportData.format,
            status: 'success',
            user: localStorage.getItem('userName') || 'Utilisateur actuel',
            details: {
              includeProperties: exportData.includeProperties,
              includeMaterials: exportData.includeMaterials,
              fileSize: '1.2MB' // Taille simulée
            }
          });
        } else if (exportData.target === 'email') {
          // Ajouter l'opération à l'historique local
          const historyEntry = addOperationToHistory({
            type: 'export',
            destination: exportData.destination,
            format: exportData.format,
            status: 'success',
            user: localStorage.getItem('userName') || 'Utilisateur actuel',
            details: {
              includeProperties: exportData.includeProperties,
              includeMaterials: exportData.includeMaterials,
              emailSent: true
            }
          });
        } else {
          // Autre destination (cloud, etc.)
          const historyEntry = addOperationToHistory({
            type: 'export',
            destination: exportData.target,
            format: exportData.format,
            status: 'success',
            user: localStorage.getItem('userName') || 'Utilisateur actuel',
            details: {
              includeProperties: exportData.includeProperties,
              includeMaterials: exportData.includeMaterials
            }
          });
        }
        
        return {
          success: true,
          message: 'Export simulé réussi',
          fileName: exportData.target === 'file' ? `export_${new Date().getTime()}.${exportData.format}` : null,
          destination: exportData.target === 'email' ? exportData.destination : null
        };
      }

      const response = await api.post('/api/integration/export', exportData);
      
      // Si c'est un téléchargement de fichier, déclencher le téléchargement
      if (exportData.target === 'file' && response.data.fileUrl) {
        window.location.href = response.data.fileUrl;
      }
      
      // Si l'export est réussi, ajouter à l'historique local
      if (response.data.success) {
        addOperationToHistory({
          type: 'export',
          destination: exportData.target === 'email' ? exportData.destination : 
                      exportData.target === 'file' ? response.data.fileName || 'Fichier téléchargé' : 
                      exportData.target,
          format: exportData.format,
          status: 'success',
          user: localStorage.getItem('userName') || 'Utilisateur actuel',
          details: {
            ...response.data,
            includeProperties: exportData.includeProperties,
            includeMaterials: exportData.includeMaterials
          }
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de l\'exportation:', error);
      throw new Error(error.response?.data?.message || 'Échec de l\'exportation');
    }
  },

  /**
   * Récupère la liste des connecteurs disponibles
   * @returns {Promise<Array>} - La liste des connecteurs
   */
  getConnectors: async () => {
    try {
      // Pour simuler l'API si elle n'existe pas encore
      if (process.env.NODE_ENV === 'development' && !process.env.USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 800)); // Délai artificiel
        return [
          { id: 'revit', name: 'Autodesk Revit', status: 'active', version: '2025', lastUsed: '2025-06-28T14:22:45' },
          { id: 'archicad', name: 'GRAPHISOFT ArchiCAD', status: 'active', version: '26', lastUsed: '2025-06-29T10:15:30' },
          { id: 'tekla', name: 'Trimble Tekla', status: 'available', version: '2024', lastUsed: null },
          { id: 'navisworks', name: 'Autodesk Navisworks', status: 'available', version: '2025', lastUsed: null },
          { id: 'ifc', name: 'IFC', status: 'active', version: '4', lastUsed: '2025-06-30T09:45:12' },
          { id: 'sketchup', name: 'SketchUp', status: 'inactive', version: '2025', lastUsed: '2025-05-15T11:30:00' }
        ];
      }

      const response = await api.get('/api/integration/connectors');
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des connecteurs:', error);
      throw new Error(error.response?.data?.message || 'Échec de la récupération des connecteurs');
    }
  },

  /**
   * Met à jour le statut d'un connecteur
   * @param {string} connectorId - L'ID du connecteur
   * @param {string} status - Le nouveau statut ('active', 'inactive')
   * @returns {Promise<Object>} - Le résultat de la mise à jour
   */
  updateConnectorStatus: async (connectorId, status) => {
    try {
      // Pour simuler l'API si elle n'existe pas encore
      if (process.env.NODE_ENV === 'development' && !process.env.USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Délai artificiel
        return {
          success: true,
          message: `Statut du connecteur ${connectorId} mis à jour avec succès`,
          newStatus: status
        };
      }

      const response = await api.put(`/api/integration/connectors/${connectorId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour du connecteur ${connectorId}:`, error);
      throw new Error(error.response?.data?.message || 'Échec de la mise à jour du connecteur');
    }
  },

  /**
   * Récupère l'historique des opérations d'importation/exportation
   * @param {Object} filters - Filtres pour l'historique (dates, types, etc.)
   * @returns {Promise<Array>} - L'historique des opérations
   */
  getOperationHistory: async (filters = {}) => {
    try {
      // D'abord, essayer de récupérer l'historique local réel
      const localHistory = getLocalOperationHistory();
      
      // Si nous avons des opérations locales, les renvoyer
      if (localHistory.length > 0) {
        console.log('📜 Historique local récupéré:', localHistory.length, 'opérations');
        
        // Appliquer des filtres si nécessaire
        let filteredHistory = [...localHistory];
        
        if (filters.type) {
          filteredHistory = filteredHistory.filter(op => op.type === filters.type);
        }
        
        if (filters.status) {
          filteredHistory = filteredHistory.filter(op => op.status === filters.status);
        }
        
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          filteredHistory = filteredHistory.filter(op => new Date(op.date) >= fromDate);
        }
        
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          filteredHistory = filteredHistory.filter(op => new Date(op.date) <= toDate);
        }
        
        return filteredHistory;
      }
      
      // Pour simuler l'API si l'historique local est vide
      if (process.env.NODE_ENV === 'development' && !process.env.USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 700)); // Délai artificiel
        
        // Créer un historique simulé avec des valeurs réalistes
        const simulatedHistory = [
          { 
            id: 101, 
            type: 'import', 
            source: 'Building-Project.ifc', 
            format: 'ifc4',
            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Hier
            status: 'success', 
            user: 'Utilisateur actuel', 
            details: { 
              elements: 124, 
              properties: 756, 
              projectName: 'Building Project',
              stats: { wallCount: 42, doorCount: 15, windowCount: 28 }
            } 
          },
          { 
            id: 102, 
            type: 'export', 
            destination: 'export-model.ifc', 
            format: 'ifc4',
            date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // Avant-hier
            status: 'success', 
            user: 'Utilisateur actuel', 
            details: { format: 'IFC4', fileSize: '2.4MB' } 
          },
          { 
            id: 103, 
            type: 'import', 
            source: 'Commercial-Space.ifc', 
            format: 'ifc2x3',
            date: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // Il y a 3 jours
            status: 'failed', 
            user: 'Utilisateur actuel', 
            error: 'Format incompatible', 
            details: { error: 'Invalid schema version' } 
          },
          { 
            id: 104, 
            type: 'export', 
            destination: 'data-export.cobie', 
            format: 'cobie',
            date: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(), // Il y a 4 jours
            status: 'success', 
            user: 'Utilisateur actuel', 
            details: { fileSize: '1.2MB' } 
          },
          { 
            id: 105, 
            type: 'import', 
            source: 'Residential-Tower.ifc', 
            format: 'ifc4',
            date: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(), // Il y a 5 jours
            status: 'success', 
            user: 'Utilisateur actuel', 
            details: { 
              elements: 287, 
              properties: 1412,
              projectName: 'Residential Tower',
              stats: { wallCount: 97, doorCount: 52, windowCount: 124 }
            } 
          }
        ];
        
        // Sauvegarder l'historique simulé pour les prochaines utilisations
        saveLocalOperationHistory(simulatedHistory);
        
        return simulatedHistory;
      }

      // Si nous arrivons ici et que nous avons une API réelle, l'utiliser
      const response = await api.get('/api/integration/history', { params: filters });
      
      // Sauvegarder l'historique récupéré de l'API pour une utilisation hors ligne
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        saveLocalOperationHistory(response.data);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'historique des opérations:', error);
      
      // En cas d'erreur, essayer de renvoyer l'historique local
      const localHistory = getLocalOperationHistory();
      if (localHistory.length > 0) {
        console.log('📜 Utilisation de l\'historique local après erreur API');
        return localHistory;
      }
      
      throw new Error(error.response?.data?.message || 'Échec de la récupération de l\'historique');
    }
  },

  /**
   * Récupère les formats d'échange disponibles
   * @returns {Promise<Array>} - La liste des formats d'échange
   */
  getExchangeFormats: async () => {
    try {
      // Pour simuler l'API si elle n'existe pas encore
      if (process.env.NODE_ENV === 'development' && !process.env.USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 300)); // Délai artificiel
        return [
          { id: 'ifc2x3', name: 'IFC 2x3', description: 'Industry Foundation Classes 2x3', supported: true },
          { id: 'ifc4', name: 'IFC 4', description: 'Industry Foundation Classes 4', supported: true },
          { id: 'bcf', name: 'BCF', description: 'BIM Collaboration Format', supported: true },
          { id: 'cobie', name: 'COBie', description: 'Construction Operations Building Information Exchange', supported: true },
          { id: 'dwg', name: 'DWG', description: 'Native AutoCAD Drawing Format', supported: true },
          { id: 'gbxml', name: 'gbXML', description: 'Green Building XML', supported: true },
          { id: 'obj', name: 'OBJ', description: 'Wavefront 3D Object Format', supported: true },
          { id: 'fbx', name: 'FBX', description: 'Filmbox 3D Format', supported: false, comingSoon: true }
        ];
      }

      const response = await api.get('/api/integration/formats');
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des formats d\'échange:', error);
      throw new Error(error.response?.data?.message || 'Échec de la récupération des formats d\'échange');
    }
  },

  /**
   * Récupère les API externes configurées
   * @returns {Promise<Array>} - La liste des API externes
   */
  getExternalApis: async () => {
    try {
      // Pour simuler l'API si elle n'existe pas encore
      if (process.env.NODE_ENV === 'development' && !process.env.USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Délai artificiel
        return [
          { 
            id: 'bimrecovery-api', 
            name: 'BIM Recovery API', 
            status: 'connected', 
            lastSync: new Date().toISOString(), 
            url: `${API_BASE_URL}/api`, 
            apiKey: '****',
            description: 'API principale BIM Recovery pour la gestion des projets et utilisateurs'
          },
          { 
            id: 'auth-api', 
            name: 'API Authentication', 
            status: 'connected', 
            lastSync: new Date().toISOString(), 
            url: `${API_BASE_URL}/api/Auth`, 
            apiKey: '****',
            description: 'API d\'authentification et de gestion des utilisateurs'
          },
          { 
            id: 'projects-api', 
            name: 'API Projets', 
            status: 'connected', 
            lastSync: new Date().toISOString(), 
            url: `${API_BASE_URL}/api/Projects`, 
            apiKey: '****',
            description: 'API de gestion des projets BIM'
          },
          { 
            id: 'collab-api', 
            name: 'API Collaboration', 
            status: 'connected', 
            lastSync: new Date().toISOString(), 
            url: `${API_BASE_URL}/api/Collaboration`, 
            apiKey: '****',
            description: 'API pour les fonctionnalités collaboratives'
          },
          { 
            id: 'notification-api', 
            name: 'API Notifications', 
            status: 'connected', 
            lastSync: new Date().toISOString(), 
            url: `${API_BASE_URL}/api/notifications`, 
            apiKey: '****',
            description: 'API de gestion des notifications utilisateurs'
          },
          { 
            id: 'forge-api', 
            name: 'Autodesk Forge API', 
            status: 'configured', 
            lastSync: '2025-06-25T09:30:15', 
            url: 'https://developer.api.autodesk.com/modelderivative/v2', 
            apiKey: '****',
            description: 'API externe pour la visualisation et transformation de modèles 3D'
          }
        ];
      }

      const response = await api.get('/api/integration/external-apis');
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des API externes:', error);
      throw new Error(error.response?.data?.message || 'Échec de la récupération des API externes');
    }
  },

  /**
   * Synchronise avec une API externe
   * @param {string} apiId - L'ID de l'API externe
   * @returns {Promise<Object>} - Le résultat de la synchronisation
   */
  syncExternalApi: async (apiId) => {
    try {
      // Pour simuler l'API si elle n'existe pas encore
      if (process.env.NODE_ENV === 'development' && !process.env.USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Délai artificiel
        return {
          success: true,
          message: `Synchronisation avec ${apiId} réussie`,
          lastSync: new Date().toISOString(),
          details: { itemsSynced: Math.floor(Math.random() * 30) + 5 }
        };
      }

      const response = await api.post(`/api/integration/external-apis/${apiId}/sync`);
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur lors de la synchronisation avec l'API ${apiId}:`, error);
      throw new Error(error.response?.data?.message || 'Échec de la synchronisation');
    }
  },
  
  /**
   * Configure une nouvelle API externe ou met à jour une existante
   * @param {Object} apiConfig - La configuration de l'API
   * @returns {Promise<Object>} - Le résultat de la configuration
   */
  configureExternalApi: async (apiConfig) => {
    try {
      // Pour simuler l'API si elle n'existe pas encore
      if (process.env.NODE_ENV === 'development' && !process.env.USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 800)); // Délai artificiel
        return {
          success: true,
          message: apiConfig.id ? 'API externe mise à jour avec succès' : 'Nouvelle API externe configurée avec succès',
          api: {
            id: apiConfig.id || `api-${new Date().getTime()}`,
            name: apiConfig.name,
            status: 'configured',
            lastSync: null,
            url: apiConfig.url,
            apiKey: '****'
          }
        };
      }

      const method = apiConfig.id ? 'put' : 'post';
      const endpoint = apiConfig.id ? `/api/integration/external-apis/${apiConfig.id}` : '/api/integration/external-apis';
      
      const response = await api[method](endpoint, apiConfig);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la configuration de l\'API externe:', error);
      throw new Error(error.response?.data?.message || 'Échec de la configuration de l\'API externe');
    }
  },
  
  /**
   * Synchronise une API externe (fonction alias de syncExternalApi pour compatibilité)
   * @param {string} apiId - L'ID de l'API externe
   * @returns {Promise<Object>} - Le résultat de la synchronisation
   */
  synchronizeApi: async (apiId) => {
    try {
      console.log('🔄 Démarrage de la synchronisation de l\'API:', apiId);
      // Utiliser la fonction existante pour éviter la duplication de code
      const result = await integrationService.syncExternalApi(apiId);
      console.log('✅ Synchronisation réussie:', result);
      return result;
    } catch (error) {
      console.error(`❌ Erreur lors de la synchronisation de l'API ${apiId}:`, error);
      throw new Error(error.message || 'Échec de la synchronisation');
    }
  }
};
