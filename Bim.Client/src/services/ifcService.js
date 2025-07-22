import axios from 'axios';
import api, { API_BASE_URL } from '../config/api.config';
import { IfcAPI } from 'web-ifc';

// Fonction pour charger l'API IFC et les fichiers WASM nécessaires
let ifcApi = null;

/**
 * Initialise l'API IFC
 * @returns {Promise<IfcAPI>} Instance de l'API IFC
 */
export const initIfcApi = async () => {
  if (!ifcApi) {
    console.log('Initialisation de l\'API IFC...');
    
    // Vérifier d'abord si les fichiers WASM existent
    try {
      const response = await fetch('/wasm/web-ifc.wasm');
      if (!response.ok) {
        console.warn(`Fichier WASM non trouvé: ${response.status} ${response.statusText}`);
      } else {
        console.log('✓ Fichier WASM trouvé et accessible');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des fichiers WASM:', error);
    }
    
    // Liste des chemins à essayer pour les fichiers WASM
    const wasmPaths = [
      '/wasm/',
      './wasm/',
      '../wasm/',
      './public/wasm/',
      '/public/wasm/',
      './',
      '/',
      // Ajout de chemins absolus pour le développement local
      `${window.location.origin}/wasm/`,
      `${window.location.origin}/public/wasm/`
    ];
    
    let initialized = false;
    let lastError = null;
    
    // Essayer chaque chemin jusqu'à ce qu'un fonctionne
    for (const wasmPath of wasmPaths) {
      if (initialized) break;
      
      try {
        // Création d'une nouvelle instance de l'API IFC
        ifcApi = new IfcAPI();
        
        console.log(`Tentative de chargement avec le chemin WASM: ${wasmPath}`);
        ifcApi.SetWasmPath(wasmPath);
        
        // Augmenter le timeout pour permettre un chargement plus long
        const initPromise = ifcApi.Init();
        
        // Ajouter un timeout pour éviter de bloquer trop longtemps
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout d\'initialisation IFC')), 10000);
        });
        
        // Utiliser Promise.race pour limiter le temps d'attente
        await Promise.race([initPromise, timeoutPromise]);
        
        // Si on arrive ici, c'est que l'initialisation a réussi
        initialized = true;
        console.log(`✓ API IFC initialisée avec succès en utilisant le chemin: ${wasmPath}`);
        
        // Créer un schéma de base pour assurer que les fonctions marchent toujours
        const baseSchema = {
          IFCWALL: 1,
          IFCDOOR: 2,
          IFCWINDOW: 3,
          IFCSLAB: 4,
          IFCPROJECT: 5,
          IFCBUILDING: 6,
          IFCBUILDINGSTOREY: 7,
          IFCSPACE: 8,
          IFCSITE: 9,
          IFCSTOREY: 10,
          IFCZONE: 11
        };
        
        // Vérifier que le schéma est correctement chargé
        if (!ifcApi.schema || Object.keys(ifcApi.schema).length === 0) {
          console.warn('⚠️ Le schéma IFC n\'a pas été chargé, utilisation d\'un schéma de base');
          ifcApi.schema = baseSchema;
        } else {
          console.log('✓ Schéma IFC chargé avec succès:', Object.keys(ifcApi.schema).length, 'entités');
          // Fusionner avec le schéma de base pour assurer que les types essentiels sont présents
          ifcApi.schema = { ...baseSchema, ...ifcApi.schema };
        }
        
      } catch (error) {
        lastError = error;
        console.warn(`Échec du chargement avec le chemin ${wasmPath}:`, error.message);
      }
    }
    
    // Si aucun chemin n'a fonctionné, utiliser une API de secours
    if (!initialized) {
      console.error('❌ Échec de l\'initialisation de l\'API IFC après plusieurs tentatives:', lastError);
      
      // Créer une API minimale pour éviter les erreurs null/undefined
      ifcApi = {
        schema: {
          IFCWALL: 1,
          IFCDOOR: 2,
          IFCWINDOW: 3,
          IFCSLAB: 4,
          IFCPROJECT: 5,
          IFCBUILDING: 6,
          IFCBUILDINGSTOREY: 7,
          IFCSPACE: 8
        },
        GetLineIDsWithType: (modelID, type) => ({ 
          size: () => 0, 
          get: () => null 
        }),
        OpenModel: (data) => 0,
        CloseModel: () => {},
        GetLine: () => null,
        isWasmInitialized: false,
        wasmModule: null
      };
      
      // Ne pas lancer d'exception, retourner l'API minimale à la place
      console.warn('⚠️ Utilisation d\'une API IFC minimale de secours - certaines fonctionnalités seront limitées');
    } else {
      // Marquer que l'initialisation a réussi
      ifcApi.isWasmInitialized = true;
    }
  }
  return ifcApi;
};

/**
 * Traite un fichier IFC côté client pour extraire des informations de base
 * @param {File} file - Le fichier IFC à traiter
 * @returns {Promise<Object>} Les métadonnées extraites du fichier IFC
 */
export const processIfcFile = async (file) => {
  try {
    console.log('Début du traitement du fichier IFC:', file.name, 'taille:', file.size);
    
    // Vérifier si le fichier est trop grand (limite à 50 Mo pour le traitement côté client)
    if (file.size > 50 * 1024 * 1024) {
      console.warn('Fichier IFC trop volumineux pour le traitement côté client:', file.size);
      return {
        success: false,
        error: 'Le fichier est trop volumineux pour être traité dans le navigateur. Taille maximum: 50 Mo.'
      };
    }
    
    try {
      // Initialiser l'API IFC si nécessaire
      console.log('Initialisation de l\'API IFC...');
      const api = await initIfcApi();
      
      if (!api || !api.schema) {
        throw new Error('API IFC ou schéma non initialisé correctement');
      }
      
      console.log('API IFC initialisée correctement.');
      
      // Lire le fichier IFC
      console.log('Lecture du fichier IFC...');
      const data = await readIfcFile(file);
      console.log('Fichier IFC lu avec succès, taille des données:', data.length);
      
      let modelID;
      try {
        // Ouvrir le modèle IFC
        console.log('Ouverture du modèle IFC...');
        modelID = api.OpenModel(data);
        console.log('Modèle IFC ouvert avec succès, ID:', modelID);
      } catch (openError) {
        console.error('Erreur lors de l\'ouverture du modèle IFC:', openError);
        return {
          success: false,
          error: 'Format IFC non reconnu ou corrompu. Veuillez vérifier votre fichier.',
          originalError: openError.toString()
        };
      }
      
      // Extraire les métadonnées de base
      console.log('Extraction des métadonnées...');
      const metadata = extractIfcMetadata(api, modelID);
      console.log('Métadonnées extraites:', metadata);
      
      try {
        // Fermer le modèle pour libérer la mémoire
        if (modelID !== undefined) {
          api.CloseModel(modelID);
          console.log('Modèle IFC fermé, ressources libérées.');
        }
      } catch (closeError) {
        console.warn('Avertissement lors de la fermeture du modèle:', closeError);
        // Ne pas bloquer le processus pour cette erreur
      }
      
      return {
        success: true,
        metadata
      };
    } catch (apiError) {
      console.error('Erreur d\'API lors du traitement IFC:', apiError);
      
      // Créer des métadonnées de secours
      const fallbackMetadata = {
        projectName: file.name.replace('.ifc', ''),
        projectDescription: 'Données extraites de l\'analyse du nom de fichier',
        totalElements: 0,
        entityCounts: {},
        stats: {
          wallCount: 0,
          doorCount: 0,
          windowCount: 0,
          floorCount: 0
        }
      };
      
      // On signale un semi-succès avec des données minimales
      return {
        success: true,
        metadata: fallbackMetadata,
        warning: 'Le fichier a été importé mais les métadonnées n\'ont pas pu être extraites complètement.',
        schemaIssue: true,
        entityExtractionFailed: true
      };
    }
  } catch (error) {
    console.error('Erreur générale lors du traitement du fichier IFC:', error);
    // Fournir des informations plus détaillées sur l'erreur
    let errorMessage = error.message;
    
    // Vérifier les types d'erreur courants
    if (errorMessage.includes('WebAssembly')) {
      errorMessage = 'Erreur de chargement du module WebAssembly. Vérifiez que les fichiers .wasm sont correctement disponibles.';
    } else if (errorMessage.includes('memory')) {
      errorMessage = 'Erreur de mémoire lors du traitement. Le fichier IFC est peut-être trop volumineux pour être traité dans le navigateur.';
    } else if (errorMessage.includes('Schema')) {
      errorMessage = 'Erreur de schéma IFC. Le fichier pourrait ne pas être compatible avec la version du schéma utilisée.';
    } else if (errorMessage.includes('undefined') || errorMessage.includes('null')) {
      errorMessage = 'Une référence invalide a été détectée. Cela pourrait être dû à un problème de compatibilité avec le format du fichier IFC.';
    }
    
    return {
      success: false,
      error: errorMessage,
      originalError: error.toString()
    };
  }
};

/**
 * Lit un fichier IFC et le convertit en ArrayBuffer
 * @param {File} file - Le fichier IFC à lire
 * @returns {Promise<Uint8Array>} Les données binaires du fichier IFC
 */
const readIfcFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const arrayBuffer = reader.result;
      const data = new Uint8Array(arrayBuffer);
      resolve(data);
    };
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Extrait les métadonnées de base d'un modèle IFC
 * @param {IfcAPI} api - L'instance de l'API IFC
 * @param {number} modelID - L'ID du modèle IFC ouvert
 * @returns {Object} Les métadonnées extraites
 */
const extractIfcMetadata = (api, modelID) => {
  console.log('Extraction des métadonnées du modèle IFC, modelID:', modelID);
  
  // Récupérer tous les types d'entités IFC dans le modèle
  const allIfcTypes = [];
  
  // Vérifier si le schéma existe avant d'utiliser Object.values
  if (!api || !api.schema) {
    console.error('Erreur: Le schéma IFC n\'est pas disponible ou n\'est pas correctement initialisé');
    
    // Essayer une approche alternative pour compter les éléments
    let alternativeTotalElements = 0;
    try {
      // Méthode alternative : essayer de compter tous les éléments sans utiliser le schéma
      const allLines = api.GetAllLines(modelID);
      alternativeTotalElements = allLines.size();
      console.log(`📊 Méthode alternative: ${alternativeTotalElements} éléments trouvés`);
    } catch (altError) {
      console.warn('Méthode alternative échouée:', altError);
    }
    
    return {
      projectName: 'Inconnu',
      projectDescription: 'Schéma IFC non disponible',
      totalElements: alternativeTotalElements,
      entityCounts: {},
      stats: {
        wallCount: 0,
        doorCount: 0,
        windowCount: 0,
        floorCount: 0
      },
      schemaError: true,
      alternativeCount: true
    };
  }
  
  // Maintenant qu'on a vérifié que api.schema existe, on peut l'utiliser en toute sécurité
  Object.values(api.schema).forEach(type => {
    if (typeof type === 'number') {
      allIfcTypes.push(type);
    }
  });
  console.log(`Trouvé ${allIfcTypes.length} types d'entités IFC possibles`);
  
  // Créer un compteur pour chaque type d'entité
  const entityCounts = {};  // Toujours initialiser comme un objet vide
  let totalElements = 0;
  
  // Compter les éléments de chaque type
  allIfcTypes.forEach(type => {
    try {
      const elements = api.GetLineIDsWithType(modelID, type);
      const count = elements.size();
      if (count > 0) {
        // Convertir le numéro de type en nom de type (ex: 26 -> IFCWALL)
        const typeName = Object.keys(api.schema).find(key => api.schema[key] === type) || `Type_${type}`;
        entityCounts[typeName] = count;
        totalElements += count;
        console.log(`🔍 Trouvé ${count} éléments de type ${typeName}`);
      }
    } catch (error) {
      console.warn(`Erreur lors du comptage des éléments de type ${type}:`, error);
    }
  });
  
  console.log(`📊 Total des éléments extraits: ${totalElements}`);
  console.log(`📋 Types d'entités trouvés:`, entityCounts);
  
  // Extraire les informations du projet
  let projectName = "Inconnu";
  let projectDescription = "";
  try {
    // Trouver l'entité IfcProject
    const projectEntities = api.GetLineIDsWithType(modelID, api.schema.IFCPROJECT);
    if (projectEntities.size() > 0) {
      const projectId = projectEntities.get(0);
      const projectEntity = api.GetLine(modelID, projectId);
      
      if (projectEntity.Name && projectEntity.Name.value) {
        projectName = projectEntity.Name.value;
      }
      
      if (projectEntity.Description && projectEntity.Description.value) {
        projectDescription = projectEntity.Description.value;
      }
    }
  } catch (error) {
    console.warn('Erreur lors de l\'extraction des informations du projet:', error);
  }
  
  const result = {
    projectName,
    projectDescription,
    totalElements,
    entityCounts,
    // Ajouter des statistiques utiles
    stats: {
      wallCount: entityCounts['IFCWALL'] || 0,
      doorCount: entityCounts['IFCDOOR'] || 0,
      windowCount: entityCounts['IFCWINDOW'] || 0,
      floorCount: entityCounts['IFCSLAB'] || 0,
    }
  };
  
  console.log('🎯 Métadonnées finales extraites:', result);
  return result;
};

export const uploadIFCFile = async (file) => {
  try {
    console.log('Téléchargement du fichier IFC sur le serveur:', file.name);
    
    // Vérification de la validité du fichier
    if (!file || !file.name || !file.size) {
      console.error('Fichier IFC invalide:', file);
      return {
        success: false,
        error: 'Le fichier IFC fourni est invalide',
        fileId: null
      };
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Add required parameters for backend
    formData.append('projectId', '1'); // Default project ID
    formData.append('description', `Fichier IFC téléchargé: ${file.name}`);

    // Get the token for authentication
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    console.log('🔐 Token for file upload:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN FOUND');

    try {
      // Essayer d'abord l'API d'intégration 
      const endpoint = `${API_BASE_URL}/api/integration/import`;
      console.log(`Tentative d'upload vers: ${endpoint}`);
      
      const headers = {
        'Content-Type': 'multipart/form-data',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
      console.log('📋 Headers for upload:', Object.keys(headers));
      
      const response = await axios.post(endpoint, formData, {
        headers,
        // Ajouter un timeout pour éviter les attentes trop longues
        timeout: 30000
      });

      console.log('✓ Fichier IFC téléchargé avec succès sur le serveur');
      return {
        success: true,
        ...response.data,
        fileId: response.data?.fileId || response.data?.id || null
      };
    } catch (apiError) {
      console.error('Erreur API lors du téléchargement du fichier IFC:', apiError);
      
      // Si l'API n'est pas disponible ou le serveur ne répond pas
      if (!apiError.response || apiError.code === 'ECONNABORTED' || apiError.code === 'ERR_NETWORK') {
        console.log('Le serveur ne répond pas ou n\'est pas accessible');
        return {
          success: false,
          error: 'Le serveur n\'est pas accessible. Le fichier a été analysé localement uniquement.',
          localOnly: true,
          serverUnavailable: true
        };
      }
      
      // Si l'erreur est un 404, tenter l'endpoint IFC direct comme fallback
      if (apiError.response?.status === 404) {
        console.log('Endpoint d\'intégration non trouvé (404), tentative sur l\'endpoint IFC direct...');
        try {
          const fallbackEndpoint = `${API_BASE_URL}/api/ifc/upload`;
          console.log(`Tentative d'upload vers: ${fallbackEndpoint}`);
          
          const fallbackResponse = await axios.post(fallbackEndpoint, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 30000
          });
          
          console.log('✓ Fichier IFC téléchargé avec succès via l\'endpoint fallback');
          return {
            success: true,
            ...fallbackResponse.data,
            fileId: fallbackResponse.data?.fileId || fallbackResponse.data?.id || null
          };
        } catch (fallbackError) {
          console.error('Échec également sur l\'endpoint fallback:', fallbackError);
          return {
            success: false,
            error: `Les endpoints d'upload ne sont pas disponibles sur le serveur. L'analyse locale a été effectuée, mais le fichier n'a pas pu être sauvegardé sur le serveur.`,
            localOnly: true,
            fileId: null
          };
        }
      }
      
      // Gérer les autres codes d'erreur HTTP
      let errorMessage = 'Erreur lors du téléchargement du fichier sur le serveur';
      
      if (apiError.response?.status === 403) {
        errorMessage = 'Vous n\'avez pas les permissions nécessaires pour télécharger des fichiers.';
      } else if (apiError.response?.status === 413) {
        errorMessage = 'Le fichier est trop volumineux pour être téléchargé sur le serveur.';
      } else if (apiError.response?.status === 401) {
        errorMessage = 'Authentification requise pour télécharger des fichiers.';
      } else if (apiError.response?.status >= 500) {
        errorMessage = 'Erreur serveur lors du téléchargement du fichier. L\'analyse locale a été effectuée.';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        localOnly: true,
        fileId: null,
        statusCode: apiError.response?.status || 0
      };
    }
  } catch (error) {
    console.error('Erreur générale lors du téléchargement du fichier IFC:', error);
    return {
      success: false,
      error: error.message || 'Une erreur inattendue s\'est produite lors du téléchargement',
      localOnly: true,
      fileId: null
    };
  }
};

export const getIFCFile = async (fileId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/IFC/${fileId}`, {
      responseType: 'blob',
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching IFC file:', error);
    throw error;
  }
};

export const convertIFCToPDF = async (projectId, fileId) => {
  try {
    console.log('Converting to PDF:', { projectId, fileId });
    
    // Verify token before making request
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found for PDF conversion');
      throw new Error('Vous n\'êtes pas authentifié. Veuillez vous reconnecter pour convertir en PDF.');
    }
    
    // Explicitly set token in headers for this critical request
    const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    const headers = {
      'Authorization': tokenValue,
      'Accept': 'application/pdf'
    };
    
    let response;
    
    try {
      // First attempt with Projects capitalized
      response = await api.get(
        `/api/Projects/${projectId}/files/${fileId}/pdf`,
        {
          responseType: 'blob',
          headers
        }
      );
      return response.data;
    } catch (firstError) {
      console.log('First endpoint attempt failed, trying alternative format...', firstError);
      
      if (firstError.response && firstError.response.status === 401) {
        console.log('Authentication error detected, attempting token refresh before retry');
        
        try {
          // Try to verify and refresh token
          const refreshResponse = await api.get('/api/users/profile', {
            headers: { 'Authorization': tokenValue }
          });
          
          if (refreshResponse.status === 200) {
            console.log('Token verified via profile endpoint, retrying with confirmed token');
          }
        } catch (refreshError) {
          console.warn('Token refresh attempt failed', refreshError);
        }
      }
      
      // Second attempt with projects lowercase (in case API is case sensitive)
      response = await api.get(
        `/api/projects/${projectId}/files/${fileId}/pdf`,
        {
          responseType: 'blob',
          headers
        }
      );
      return response.data;
    }
  } catch (error) {
    console.error('Error converting to PDF:', error);
    
    // Detailed error analysis and reporting
    if (error.response) {
      console.error(`Server responded with status: ${error.response.status}`);
      
      if (error.response.status === 401) {
        console.error('Authentication failed. Token may be invalid or expired.');
        
        // Check token status
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        console.error('Current token status:', token ? 'Present' : 'Missing');
        
        // Attempt direct axios call as last resort
        try {
          console.log('Attempting direct axios call as fallback...');
          const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          
          const fallbackResponse = await axios.get(
            `${API_BASE_URL}/api/projects/${projectId}/files/${fileId}/pdf`,
            {
              responseType: 'blob',
              headers: {
                'Authorization': tokenValue,
                'Accept': 'application/pdf'
              }
            }
          );
          
          if (fallbackResponse.status === 200) {
            console.log('Fallback direct axios call succeeded!');
            return fallbackResponse.data;
          }
        } catch (fallbackError) {
          console.error('Fallback attempt also failed:', fallbackError);
        }
        
        throw new Error('Erreur d\'authentification. Veuillez vous reconnecter et réessayer.');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error('Le serveur ne répond pas. Vérifiez votre connexion internet.');
    }
    throw error;
  }
};

export const convertIFCToXML = async (projectId, fileId) => {
  try {
    console.log('Converting to XML:', { projectId, fileId });
    
    // Verify token before making request
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found for XML conversion');
      throw new Error('Vous n\'êtes pas authentifié. Veuillez vous reconnecter pour convertir en XML.');
    }
    
    // Explicitly set token in headers for this critical request
    const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    const headers = {
      'Authorization': tokenValue,
      'Accept': 'application/xml'
    };
    
    let response;
    
    try {
      // First attempt with Projects capitalized
      response = await api.get(
        `/api/Projects/${projectId}/files/${fileId}/xml`,
        {
          responseType: 'text',
          headers
        }
      );
      return response.data;
    } catch (firstError) {
      console.log('First endpoint attempt failed, trying alternative format...', firstError);
      
      if (firstError.response && firstError.response.status === 401) {
        console.log('Authentication error detected, attempting token refresh before retry');
        
        try {
          // Try to verify and refresh token
          const refreshResponse = await api.get('/api/users/profile', {
            headers: { 'Authorization': tokenValue }
          });
          
          if (refreshResponse.status === 200) {
            console.log('Token verified via profile endpoint, retrying with confirmed token');
          }
        } catch (refreshError) {
          console.warn('Token refresh attempt failed', refreshError);
        }
      }
      
      // Second attempt with projects lowercase (in case API is case sensitive)
      response = await api.get(
        `/api/projects/${projectId}/files/${fileId}/xml`,
        {
          responseType: 'text',
          headers
        }
      );
      return response.data;
    }
  } catch (error) {
    console.error('Error converting to XML:', error);
    
    // Detailed error analysis and reporting
    if (error.response) {
      console.error(`Server responded with status: ${error.response.status}`);
      
      if (error.response.status === 401) {
        console.error('Authentication failed. Token may be invalid or expired.');
        
        // Check token status
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        console.error('Current token status:', token ? 'Present' : 'Missing');
        
        // Attempt direct axios call as last resort
        try {
          console.log('Attempting direct axios call as fallback for XML...');
          const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          
          const fallbackResponse = await axios.get(
            `${API_BASE_URL}/api/projects/${projectId}/files/${fileId}/xml`,
            {
              responseType: 'text',
              headers: {
                'Authorization': tokenValue,
                'Accept': 'application/xml'
              }
            }
          );
          
          if (fallbackResponse.status === 200) {
            console.log('Fallback direct axios call succeeded for XML!');
            return fallbackResponse.data;
          }
        } catch (fallbackError) {
          console.error('Fallback attempt also failed for XML:', fallbackError);
        }
        
        throw new Error('Erreur d\'authentification. Veuillez vous reconnecter et réessayer.');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error('Le serveur ne répond pas. Vérifiez votre connexion internet.');
    }
    throw error;
  }
};