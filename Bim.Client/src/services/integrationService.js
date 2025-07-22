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
    const history = storedHistory ? JSON.parse(storedHistory) : [];
    
    // Nettoyer les doublons au chargement
    const cleanHistory = removeDuplicatesFromHistory(history);
    
    // Sauvegarder l'historique nettoyé si nécessaire
    if (cleanHistory.length !== history.length) {
      console.log(`🧹 Doublons supprimés: ${history.length - cleanHistory.length}`);
      saveLocalOperationHistory(cleanHistory);
    }
    
    return cleanHistory;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique local:', error);
    return [];
  }
};

/**
 * Supprime les doublons d'un historique
 * @param {Array} history - L'historique à nettoyer
 * @returns {Array} - L'historique sans doublons
 */
const removeDuplicatesFromHistory = (history) => {
  const seen = new Set();
  const cleanHistory = [];
  
  history.forEach(op => {
    const key = `${op.type}-${op.source || op.file}-${op.date}`;
    if (!seen.has(key)) {
      seen.add(key);
      cleanHistory.push(op);
    }
  });
  
  return cleanHistory;
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
  
  // Vérifier les doublons avant d'ajouter
  const isDuplicate = history.some(existingOp => {
    // Vérifier si c'est le même fichier importé dans les 5 dernières secondes
    const timeDiff = Math.abs(new Date(newOperation.date).getTime() - new Date(existingOp.date).getTime());
    const isSameFile = (existingOp.source || existingOp.file) === (newOperation.source || newOperation.file);
    const isSameType = existingOp.type === newOperation.type;
    const isRecent = timeDiff < 5000; // 5 secondes
    
    return isSameFile && isSameType && isRecent;
  });
  
  if (isDuplicate) {
    console.log('⚠️ Doublon détecté, opération ignorée:', newOperation.source || newOperation.file);
    return history.find(op => 
      (op.source || op.file) === (newOperation.source || newOperation.file) && 
      op.type === newOperation.type
    );
  }
  
  // Ajouter au début pour que les plus récentes apparaissent en premier
  history.unshift(newOperation);
  
  // Limiter la taille de l'historique (optionnel)
  const limitedHistory = history.slice(0, 50);
  
  saveLocalOperationHistory(limitedHistory);
  console.log('✅ Opération ajoutée à l\'historique local:', newOperation.source || newOperation.file);
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
        console.log('🔍 Debug métadonnées IFC:', {
          totalElements: ifcResult.metadata.totalElements,
          entityCounts: ifcResult.metadata.entityCounts,
          metadata: ifcResult.metadata
        });
        
        const elementsCount = ifcResult.metadata.totalElements || 0;
        console.log('📊 Nombre d\'éléments pour l\'historique:', elementsCount);
        
        const historyEntry = addOperationToHistory({
          type: 'import',
          source: importData.file.name,
          file: importData.file.name,
          size: `${(importData.file.size / (1024 * 1024)).toFixed(2)} MB`,
          format: importData.format,
          status: 'success',
          user: localStorage.getItem('userName') || 'Utilisateur actuel',
          elements: elementsCount,
          details: {
            elements: elementsCount,
            properties: Object.keys(ifcResult.metadata.entityCounts || {}).length,
            projectName: ifcResult.metadata.projectName || 'Inconnu',
            stats: ifcResult.metadata.stats || {}
          }
        });
        
        console.log('✅ Opération ajoutée à l\'historique local:', historyEntry);
        
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

      // Pour simuler l'API si elle n'existe pas encore (seulement pour les non-IFC)
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Délai artificiel
        
        // Pour les simulations, ajouter aussi à l'historique UNIQUEMENT si ce n'est pas un fichier IFC
        // (car les fichiers IFC sont déjà traités dans la logique ci-dessus)
        if (!importData.file || 
            (!importData.file.name.endsWith('.ifc') && !importData.file.name.endsWith('.ifcXML'))) {
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
        } else {
          // Pour les fichiers IFC, ne pas ajouter à l'historique ici car c'est déjà fait
          return {
            success: true,
            message: 'Import IFC simulé réussi',
            source: 'simulated',
            data: {
              elements: 156,
              properties: 892,
              warnings: 3
            }
          };
        }
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
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
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
      // Utilisation de import.meta.env au lieu de process.env pour Vite
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
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
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
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
      console.log('📋 Récupération de l\'historique avec filtres:', filters);
      
      // Essayer d'abord l'API réelle
      try {
        const response = await api.get('/api/integration/history', { params: filters });
        console.log('✅ Historique API récupéré:', response.data);
        
        // Récupérer l'historique local pour fusionner avec l'historique de l'API
        const localHistory = getLocalOperationHistory();
        
        // Fusionner l'historique API avec l'historique local récent
        // Priorité aux opérations locales récentes (moins de 5 minutes)
        const recentThreshold = Date.now() - (5 * 60 * 1000); // 5 minutes
        const recentLocalOperations = localHistory.filter(op => 
          new Date(op.date).getTime() > recentThreshold
        );
        
        let mergedHistory = response.data || [];
        
        // Ajouter les opérations locales récentes qui ne sont pas dans l'API
        recentLocalOperations.forEach(localOp => {
          const existsInApi = mergedHistory.some(apiOp => 
            apiOp.id === localOp.id || 
            (apiOp.source === localOp.source && 
             Math.abs(new Date(apiOp.date).getTime() - new Date(localOp.date).getTime()) < 10000)
          );
          
          if (!existsInApi) {
            console.log('🔄 Ajout de l\'opération locale récente à l\'historique:', localOp);
            mergedHistory.unshift(localOp);
          }
        });
        
        // Sauvegarder l'historique fusionné
        if (mergedHistory.length > 0) {
          saveLocalOperationHistory(mergedHistory);
        }
        
        return mergedHistory;
      } catch (apiError) {
        console.warn('⚠️ API indisponible, utilisation de l\'historique local:', apiError.message);
        
        // Récupérer l'historique local si l'API n'est pas disponible
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
        
        // Données de démonstration seulement si pas d'historique local ET pas de vraies opérations récentes
        console.log('📋 Aucun historique local trouvé, création d\'un historique de démonstration');
        const demoHistory = [
          { 
            id: 'demo-101', 
            type: 'import', 
            source: 'Building-Project.ifc', 
            format: 'ifc4',
            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            status: 'success', 
            user: 'Utilisateur démo', 
            details: { 
              elements: 124, 
              properties: 756, 
              projectName: 'Building Project',
              stats: { wallCount: 42, doorCount: 15, windowCount: 28 }
            } 
          },
          { 
            id: 'demo-102', 
            type: 'export', 
            destination: 'export-model.ifc', 
            format: 'ifc4',
            date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            status: 'success', 
            user: 'Utilisateur démo', 
            details: { format: 'IFC4', fileSize: '2.4MB' } 
          }
        ];
        
        return demoHistory;
      }
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
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
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
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
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
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
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
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
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
  },

  /**
   * Importe un fichier avec gestion du progrès
   * @param {File} file - Le fichier à importer
   * @param {Object} options - Options d'importation avec projectId et onProgress
   * @returns {Promise<Object>} - Le résultat de l'importation
   */
  importFile: async (file, options = {}) => {
    try {
      const importData = {
        file: file,
        format: options.format || 'ifc4',
        sourceType: 'file',
        options: {
          validateGeometry: options.validateGeometry ?? true,
          importProperties: options.importProperties ?? true,
          importMaterials: options.importMaterials ?? true,
          generateThumbnails: options.generateThumbnails ?? false,
          preserveHierarchy: options.preserveHierarchy ?? true
        }
      };

      if (options.onProgress) {
        // Simuler le progrès
        const progressInterval = setInterval(() => {
          const progress = Math.min(100, Math.floor(Math.random() * 100));
          options.onProgress(progress);
        }, 200);

        const result = await integrationService.importData(importData);
        clearInterval(progressInterval);
        options.onProgress(100);
        return result;
      }

      return await integrationService.importData(importData);
    } catch (error) {
      console.error('❌ Erreur lors de l\'importation de fichier:', error);
      throw error;
    }
  },

  /**
   * Importe depuis une URL
   * @param {string} url - URL source
   * @param {Object} options - Options d'importation
   * @returns {Promise<Object>} - Le résultat de l'importation
   */
  importFromUrl: async (url, options = {}) => {
    try {
      const importData = {
        url: url,
        format: options.format || 'ifc4',
        sourceType: 'url',
        options: {
          validateGeometry: options.validateGeometry ?? true,
          importProperties: options.importProperties ?? true,
          importMaterials: options.importMaterials ?? true,
          generateThumbnails: options.generateThumbnails ?? false,
          preserveHierarchy: options.preserveHierarchy ?? true
        }
      };

      return await integrationService.importData(importData);
    } catch (error) {
      console.error('❌ Erreur lors de l\'importation depuis URL:', error);
      throw error;
    }
  },

  /**
   * Valide un fichier avant importation
   * @param {File} file - Le fichier à valider
   * @param {Array} supportedFormats - Les formats supportés
   * @returns {Object} - Résultat de la validation
   */
  validateFile: (file, supportedFormats = []) => {
    const errors = [];
    
    if (!file) {
      errors.push('Aucun fichier sélectionné');
      return { valid: false, errors };
    }

    // Vérifier la taille du fichier (limite à 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB en bytes
    if (file.size > maxSize) {
      errors.push('Le fichier est trop volumineux (maximum 100MB)');
    }

    // Vérifier l'extension
    const extension = file.name.split('.').pop().toLowerCase();
    
    // Mapping des extensions vers les formats supportés
    const extensionToFormatMap = {
      'ifc': ['ifc4', 'ifc2x3'],
      'ifcxml': ['ifc4', 'ifc2x3'],
      'dwg': ['dwg'],
      'dxf': ['dwg'],
      'step': ['step'],
      'stp': ['step'],
      'obj': ['obj'],
      'gltf': ['gltf'],
      'glb': ['gltf'],
      'cobie': ['cobie'],
      'gbxml': ['gbxml'],
      'json': ['json'],
      'csv': ['csv'],
      'xlsx': ['excel'],
      'xls': ['excel']
    };

    // Vérifier si l'extension est supportée
    const supportedExtensions = Object.keys(extensionToFormatMap);
    if (!supportedExtensions.includes(extension)) {
      errors.push(`Format de fichier non supporté: .${extension}`);
    } else {
      // Vérifier si au moins un format correspondant à cette extension est supporté
      const possibleFormats = extensionToFormatMap[extension];
      const availableFormats = supportedFormats.map(f => f.id.toLowerCase());
      
      if (supportedFormats.length > 0) {
        const hasValidFormat = possibleFormats.some(format => 
          availableFormats.includes(format)
        );
        
        if (!hasValidFormat) {
          errors.push(`Aucun format supporté disponible pour l'extension .${extension}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Récupère les formats supportés
   * @returns {Promise<Array>} - Liste des formats supportés
   */
  getSupportedFormats: async () => {
    try {
      // Pour simuler l'API si elle n'existe pas encore
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return [
          { id: 'ifc4', name: 'IFC 4.0', description: 'Standard BIM ouvert', supported: true },
          { id: 'ifc2x3', name: 'IFC 2x3', description: 'Version classique IFC', supported: true },
          { id: 'dwg', name: 'DWG', description: 'Format AutoCAD', supported: true },
          { id: 'step', name: 'STEP', description: 'Format 3D standard', supported: true },
          { id: 'obj', name: 'OBJ', description: 'Format 3D simple', supported: true },
          { id: 'gltf', name: 'glTF', description: 'Format 3D web', supported: true },
          { id: 'cobie', name: 'COBie', description: 'Construction Operations Building information exchange', supported: true },
          { id: 'gbxml', name: 'gbXML', description: 'Green Building XML', supported: true }
        ];
      }

      const response = await api.get('/api/integration/supported-formats');
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des formats supportés:', error);
      // Retourner des formats par défaut
      return [
        { id: 'ifc4', name: 'IFC 4.0', description: 'Standard BIM ouvert', supported: true },
        { id: 'ifc2x3', name: 'IFC 2x3', description: 'Version classique IFC', supported: true },
        { id: 'dwg', name: 'DWG', description: 'Format AutoCAD', supported: true }
      ];
    }
  },

  /**
   * Active/désactive un connecteur
   * @param {string} connectorId - ID du connecteur
   * @param {string} status - Nouveau statut
   * @returns {Promise<Object>} - Résultat de l'opération
   */
  toggleConnector: async (connectorId, status) => {
    try {
      // Pour simuler l'API si elle n'existe pas encore
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return {
          success: true,
          message: `Connecteur ${status === 'active' ? 'activé' : 'désactivé'} avec succès`,
          connectorId,
          newStatus: status
        };
      }

      const response = await api.put(`/api/integration/connectors/${connectorId}/toggle`, { status });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors du changement de statut du connecteur:', error);
      throw new Error(error.response?.data?.message || 'Échec du changement de statut');
    }
  },

  /**
   * Synchronise un connecteur
   * @param {string} connectorId - ID du connecteur
   * @returns {Promise<Object>} - Résultat de la synchronisation
   */
  syncConnector: async (connectorId) => {
    try {
      // Pour simuler l'API si elle n'existe pas encore
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        return {
          success: true,
          message: `Connecteur ${connectorId} synchronisé avec succès`,
          connectorId,
          lastSync: new Date().toISOString()
        };
      }

      const response = await api.post(`/api/integration/connectors/${connectorId}/sync`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation du connecteur:', error);
      throw new Error(error.response?.data?.message || 'Échec de la synchronisation');
    }
  },

  /**
   * Crée un nouveau connecteur
   * @param {Object} connectorData - Données du connecteur
   * @returns {Promise<Object>} - Résultat de la création
   */
  createConnector: async (connectorData) => {
    try {
      // Pour simuler l'API si elle n'existe pas encore
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          success: true,
          message: `Connecteur ${connectorData.name} créé avec succès`,
          connector: {
            id: `connector-${Date.now()}`,
            name: connectorData.name,
            type: connectorData.type,
            status: 'inactive',
            version: connectorData.version || '1.0',
            lastUsed: null,
            created: new Date().toISOString()
          }
        };
      }

      const response = await api.post('/api/integration/connectors', connectorData);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la création du connecteur:', error);
      throw new Error(error.response?.data?.message || 'Échec de la création du connecteur');
    }
  },

  /**
   * Teste une API externe
   * @param {string} apiId - ID de l'API
   * @returns {Promise<Object>} - Résultat du test
   */
  testExternalApi: async (apiId) => {
    try {
      // Pour simuler l'API si elle n'existe pas encore
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Simuler un succès ou échec aléatoire
        const success = Math.random() > 0.3;
        return {
          success,
          message: success ? 'Connexion API réussie' : 'Échec de la connexion API',
          apiId,
          responseTime: Math.floor(Math.random() * 1000) + 100,
          lastTest: new Date().toISOString()
        };
      }

      const response = await api.post(`/api/integration/external-apis/${apiId}/test`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors du test de l\'API externe:', error);
      throw new Error(error.response?.data?.message || 'Échec du test de connexion');
    }
  },

  /**
   * Supprime une API externe
   * @param {string} apiId - ID de l'API
   * @returns {Promise<Object>} - Résultat de la suppression
   */
  deleteExternalApi: async (apiId) => {
    try {
      // Pour simuler l'API si elle n'existe pas encore
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 600));
        return {
          success: true,
          message: 'API externe supprimée avec succès',
          apiId
        };
      }

      const response = await api.delete(`/api/integration/external-apis/${apiId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de l\'API externe:', error);
      throw new Error(error.response?.data?.message || 'Échec de la suppression');
    }
  },

  /**
   * Exporte l'historique des opérations
   * @param {Object} filters - Filtres pour l'export
   * @returns {Promise<Object>} - Résultat de l'export
   */
  exportHistory: async (filters = {}) => {
    try {
      // Pour simuler l'API si elle n'existe pas encore
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Récupérer l'historique local
        const history = await integrationService.getOperationHistory(filters);
        
        // Créer un fichier CSV
        const csvContent = [
          ['Date', 'Type', 'Source/Destination', 'Format', 'Statut', 'Utilisateur', 'Détails'],
          ...history.map(op => [
            new Date(op.date).toLocaleDateString('fr-FR'),
            op.type,
            op.source || op.destination || 'N/A',
            op.format || 'N/A',
            op.status,
            op.user || 'N/A',
            JSON.stringify(op.details || {})
          ])
        ].map(row => row.join(',')).join('\n');

        // Déclencher le téléchargement
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historique_operations_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return {
          success: true,
          message: 'Historique exporté avec succès',
          fileName: `historique_operations_${new Date().toISOString().split('T')[0]}.csv`,
          itemCount: history.length
        };
      }

      const response = await api.get('/api/integration/history/export', { params: filters });
      
      // Si c'est un téléchargement direct
      if (response.data.downloadUrl) {
        window.location.href = response.data.downloadUrl;
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de l\'export de l\'historique:', error);
      throw new Error(error.response?.data?.message || 'Échec de l\'export');
    }
  },

  // Supprimer un fichier de l'historique
  async deleteHistoryFile(fileId) {
    try {
      console.log('🗑️ Suppression du fichier:', fileId);
      
      // Vérifier que l'ID est valide
      if (!fileId || fileId === 'undefined' || fileId === 'null') {
        throw new Error('ID de fichier invalide');
      }
      
      // Si l'ID commence par 'demo-', c'est un fichier de démonstration
      if (fileId.toString().startsWith('demo-')) {
        console.log('🗑️ Suppression d\'un fichier de démonstration');
        return {
          success: true,
          message: 'Fichier de démonstration supprimé (simulation)'
        };
      }
      
      const response = await api.delete(`/api/integration/delete-file/${fileId}`);
      
      console.log('✅ Réponse du serveur:', response.status, response.data);
      
      if (response.data) {
        return {
          success: true,
          message: response.data.message || 'Fichier supprimé avec succès',
          data: response.data
        };
      }
      
      return {
        success: false,
        error: 'Réponse invalide du serveur'
      };
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du fichier:', error);
      console.error('❌ Détails de l\'erreur:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      });
      
      // Messages d'erreur spécifiques selon le code de statut
      let errorMessage = 'Échec de la suppression du fichier';
      
      if (error.response?.status === 400) {
        errorMessage = 'Requête invalide. Vérifiez l\'ID du fichier.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Accès interdit. Permissions insuffisantes.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Fichier non trouvé.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
      }
      
      return {
        success: false,
        error: error.response?.data?.message || errorMessage
      };
    }
  },

  // Vider tout l'historique
  async clearAllHistory() {
    try {
      console.log('🗑️ Vidage de tout l\'historique');
      
      const response = await api.delete('/api/integration/clear-history');
      
      if (response.data) {
        return {
          success: true,
          message: response.data.message || 'Historique vidé avec succès',
          data: response.data
        };
      }
      
      return {
        success: false,
        error: 'Réponse invalide du serveur'
      };
    } catch (error) {
      console.error('❌ Erreur lors du vidage de l\'historique:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Échec du vidage de l\'historique'
      };
    }
  }
};
