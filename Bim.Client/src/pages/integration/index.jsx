import React, { useState, useContext, useEffect } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { integrationService } from '../../services/integrationService';
import { getProjects } from '../../services/projectService';
import { 
  FaExchangeAlt, FaPlug, FaHistory, FaGlobe, FaCloud, 
  FaCloudUploadAlt, FaFileImport, FaFileExport, FaDatabase, 
  FaSync, FaInfoCircle, FaExclamationTriangle, FaCheckCircle,
  FaExternalLinkAlt, FaTrash, FaPlus, FaEdit, FaCog, FaServer,
  FaCode, FaLink, FaDownload, FaUpload, FaTools, FaChartLine,
  FaConnectdevelop, FaLayerGroup, FaFileAlt, FaCodeBranch,
  FaMoon, FaSun, FaExpand, FaCompress, FaFilter, FaSearch,
  FaPlay, FaPause, FaStop, FaRetweet, FaRocket, FaShieldAlt,
  FaCogs, FaTimes
} from 'react-icons/fa';
import { Tab } from '@headlessui/react';
import { Switch } from '@headlessui/react';
import { Dialog, Transition } from '@headlessui/react';

const InteroperabilityPage = () => {
  const { texts } = useContext(LanguageContext);
  const { isAuthenticated, userData } = useContext(AuthContext);
  const { showToast } = useContext(NotificationContext);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // États pour les données réelles
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [supportedFormats, setSupportedFormats] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // États pour les formulaires
  const [importForm, setImportForm] = useState({
    sourceType: 'file',
    format: 'ifc4',
    file: null,
    url: '',
    options: { 
      validateGeometry: true, 
      importProperties: true,
      importMaterials: true,
      generateThumbnails: false,
      preserveHierarchy: true
    }
  });
  
  const [exportForm, setExportForm] = useState({
    format: 'ifc4',
    target: 'file',
    includeProperties: true,
    includeMaterials: true,
    includeGeometry: true,
    compressionLevel: 'medium',
    quality: 'high'
  });

  // États pour les résultats
  const [importResults, setImportResults] = useState(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [operationDetails, setOperationDetails] = useState(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiConfig, setApiConfig] = useState({ name: '', url: '', key: '' });
  const [apiConfigForm, setApiConfigForm] = useState({ id: null, name: '', url: '', apiKey: '', description: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);

  // États pour les connecteurs (données réelles)
  const [connectors, setConnectors] = useState([]);
  const [connectorsLoading, setConnectorsLoading] = useState(true);

  // États pour l'historique (données réelles)
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  
  // États pour la confirmation de suppression
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dangerMode, setDangerMode] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    limit: 50,
    offset: 0
  });

  // États pour les API externes (données réelles)
  const [externalApis, setExternalApis] = useState([]);
  const [apisLoading, setApisLoading] = useState(true);

  // États pour les modals
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [showConnectorModal, setShowConnectorModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  // Données pour les formats supportés (seront chargées depuis l'API)
  const [exchangeFormats, setExchangeFormats] = useState([]);

  // Animation variants
  const tabVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3
      }
    },
    exit: {
      opacity: 0,
      x: 20,
      transition: {
        duration: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  // Afficher une notification toast réelle
  const showNotification = (message, type = 'success') => {
    showToast(message, type);
  };

  // Gérer l'importation de données RÉELLE
  const handleImport = async (e) => {
    e.preventDefault();
    
    // Réinitialiser les erreurs
    setErrorMessage('');
    setShowError(false);
    
    if (importForm.sourceType === 'file' && !importForm.file) {
      const errorMsg = 'Veuillez sélectionner un fichier à importer';
      setErrorMessage(errorMsg);
      setShowError(true);
      showNotification(errorMsg, 'warning');
      return;
    }
    
    if (importForm.sourceType === 'url' && !importForm.url) {
      const errorMsg = 'Veuillez entrer une URL valide';
      setErrorMessage(errorMsg);
      setShowError(true);
      showNotification(errorMsg, 'warning');
      return;
    }

    if (!selectedProject) {
      const errorMsg = 'Veuillez sélectionner un projet';
      setErrorMessage(errorMsg);
      setShowError(true);
      showNotification(errorMsg, 'warning');
      return;
    }
    
    try {
      setLoading(true);
      setUploadProgress(0);
      
      let result;
      
      if (importForm.sourceType === 'file') {
        // Valider le fichier
        const validation = integrationService.validateFile(importForm.file, exchangeFormats);
        if (!validation.valid) {
          const errorMsg = `Fichier invalide: ${validation.errors.join(', ')}`;
          setErrorMessage(errorMsg);
          setShowError(true);
          showNotification(errorMsg, 'error');
          return;
        }

        // Importer le fichier
        result = await integrationService.importFile(importForm.file, {
          ...importForm.options,
          format: importForm.format,
          projectId: selectedProject.id,
          onProgress: (progress) => {
            setUploadProgress(progress);
          }
        });
      } else {
        // Importer depuis URL
        result = await integrationService.importFromUrl(importForm.url, {
          ...importForm.options,
          format: importForm.format,
          projectId: selectedProject.id
        });
      }
      
      if (result.success) {
        showNotification(result.message || 'Importation réussie!', 'success');
        setImportResults(result.data);
        setShowResultsModal(true);
        
        // Petit délai pour s'assurer que l'historique local est bien sauvegardé
        setTimeout(async () => {
          // Recharger l'historique pour inclure la nouvelle opération
          await loadHistory();
        }, 500);
      } else {
        const errorMsg = result.error || 'Erreur lors de l\'importation';
        setErrorMessage(errorMsg);
        setShowError(true);
        showNotification(errorMsg, 'error');
      }
    } catch (error) {
      console.error('Erreur lors de l\'importation:', error);
      const errorMsg = error.message || 'Erreur lors de l\'importation. Veuillez réessayer.';
      setErrorMessage(errorMsg);
      setShowError(true);
      showNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Gérer l'exportation de données RÉELLE
  const handleExport = async (e) => {
    e.preventDefault();

    if (!selectedProject) {
      showNotification('Veuillez sélectionner un projet', 'warning');
      return;
    }

    try {
      setLoading(true);
      
      const result = await integrationService.exportData(selectedProject.id, {
        format: exportForm.format,
        target: exportForm.target,
        includeProperties: exportForm.includeProperties,
        includeMaterials: exportForm.includeMaterials,
        includeGeometry: exportForm.includeGeometry,
        compressionLevel: exportForm.compressionLevel,
        quality: exportForm.quality
      });
      
      if (result.success) {
        showNotification(result.message, 'success');
        
        // Recharger l'historique pour inclure la nouvelle opération
        await loadHistory();
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erreur lors de l\'exportation:', error);
      showNotification('Erreur lors de l\'exportation. Veuillez réessayer.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Gérer le changement de fichier d'importation
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportForm(prev => ({ ...prev, file }));
    }
  };

  // Gérer la sauvegarde de la configuration API RÉELLE
  const handleSaveApiConfig = async (config) => {
    try {
      const result = await integrationService.configureExternalApi(config);
      
      if (result.success) {
        showNotification(result.message, 'success');
        setShowApiModal(false);
        setApiConfigForm({ id: null, name: '', url: '', apiKey: '', description: '' });
        
        // Recharger les APIs externes
        await loadExternalApis();
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'API:', error);
      showNotification('Erreur lors de la sauvegarde de l\'API', 'error');
    }
  };

  // Gérer la connexion/déconnexion d'un connecteur RÉELLE
  const toggleConnector = async (connectorId) => {
    try {
      const connector = connectors.find(c => c.id === connectorId);
      const newStatus = connector.status === 'active' ? 'inactive' : 'active';
      
      const result = await integrationService.toggleConnector(connectorId, newStatus);
      
      if (result.success) {
        // Mettre à jour localement
        setConnectors(prev => prev.map(conn => 
          conn.id === connectorId 
            ? { ...conn, status: newStatus }
            : conn
        ));
        
        showNotification(result.message, 'info');
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      showNotification('Erreur lors du changement de statut', 'error');
    }
  };

  // Synchroniser un connecteur RÉELLE
  const syncConnector = async (connectorId) => {
    try {
      const result = await integrationService.syncConnector(connectorId);
      
      if (result.success) {
        // Mettre à jour localement
        setConnectors(prev => prev.map(conn => 
          conn.id === connectorId 
            ? { ...conn, lastSync: new Date().toISOString() }
            : conn
        ));
        
        showNotification(result.message, 'success');
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      showNotification('Erreur lors de la synchronisation', 'error');
    }
  };

  // Créer un nouveau connecteur RÉEL
  const createConnector = async (connectorData) => {
    try {
      const result = await integrationService.createConnector(connectorData);
      
      if (result.success) {
        showNotification(result.message, 'success');
        setShowConnectorModal(false);
        
        // Recharger les connecteurs
        await loadConnectors();
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erreur lors de la création du connecteur:', error);
      showNotification('Erreur lors de la création du connecteur', 'error');
    }
  };

  // Tester une API externe RÉELLE
  const testExternalApi = async (apiId) => {
    try {
      const api = externalApis.find(a => a.id === apiId);
      if (!api) return;

      showNotification('Test de connexion en cours...', 'info');
      
      const result = await integrationService.testExternalApi(apiId);
      
      if (result.success) {
        // Mettre à jour localement
        setExternalApis(prev => prev.map(a => 
          a.id === apiId 
            ? { ...a, lastTest: new Date().toISOString(), status: 'connected' }
            : a
        ));
        
        showNotification(result.message, 'success');
      } else {
        // Mettre à jour le statut comme déconnecté
        setExternalApis(prev => prev.map(a => 
          a.id === apiId 
            ? { ...a, lastTest: new Date().toISOString(), status: 'disconnected' }
            : a
        ));
        
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erreur lors du test de l\'API:', error);
      showNotification('Erreur lors du test de connexion', 'error');
    }
  };

  // Supprimer une API externe RÉELLE
  const deleteExternalApi = async (apiId) => {
    try {
      if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette API externe ?')) {
        return;
      }

      const result = await integrationService.deleteExternalApi(apiId);
      
      if (result.success) {
        // Retirer de la liste locale
        setExternalApis(prev => prev.filter(a => a.id !== apiId));
        showNotification(result.message, 'info');
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'API:', error);
      showNotification('Erreur lors de la suppression', 'error');
    }
  };

  // Exporter l'historique RÉEL
  const exportHistory = async () => {
    try {
      const result = await integrationService.exportHistory(historyFilters);
      
      if (result.success) {
        showNotification(result.message, 'success');
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Erreur lors de l\'exportation de l\'historique:', error);
      showNotification('Erreur lors de l\'exportation', 'error');
    }
  };

  // Filtrer l'historique RÉEL
  const applyHistoryFilters = async (newFilters) => {
    try {
      setHistoryFilters(newFilters);
      setHistoryLoading(true);
      
      const filteredHistory = await integrationService.getOperationHistory(newFilters);
      setHistory(filteredHistory);
    } catch (error) {
      console.error('Erreur lors du filtrage:', error);
      showNotification('Erreur lors du filtrage', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Formater la date pour l'affichage
  const formatDate = (dateString) => {
    if (!dateString) {
      return 'N/A';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Erreur lors du formatage de la date:', error);
      return 'N/A';
    }
  };

  // Charger toutes les données au démarrage
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsDataLoading(true);
        
        // Charger les données en parallèle
        await Promise.all([
          loadProjects(),
          loadSupportedFormats(),
          loadConnectors(),
          loadHistory(),
          loadExternalApis()
        ]);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        showNotification('Erreur lors du chargement des données', 'error');
      } finally {
        setIsDataLoading(false);
      }
    };

    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Charger les projets
  const loadProjects = async () => {
    try {
      const projectsData = await getProjects();
      setProjects(projectsData);
      
      // Sélectionner le premier projet par défaut
      if (projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
    }
  };

  // Charger les formats supportés
  const loadSupportedFormats = async () => {
    try {
      const formats = await integrationService.getSupportedFormats();
      // Ajouter les icônes aux formats
      const formatsWithIcons = formats.map(format => ({
        ...format,
        icon: getFormatIcon(format.id)
      }));
      setExchangeFormats(formatsWithIcons);
    } catch (error) {
      console.error('Erreur lors du chargement des formats:', error);
      // Fallback avec des formats par défaut
      setExchangeFormats([
        { id: 'ifc4', name: 'IFC 4.0', icon: <FaLayerGroup />, description: 'Standard BIM ouvert', supported: true },
        { id: 'ifc2x3', name: 'IFC 2x3', icon: <FaLayerGroup />, description: 'Version classique IFC', supported: true },
        { id: 'dwg', name: 'DWG', icon: <FaFileAlt />, description: 'Format AutoCAD', supported: true },
        { id: 'step', name: 'STEP', icon: <FaCog />, description: 'Format 3D standard', supported: true },
        { id: 'obj', name: 'OBJ', icon: <FaCodeBranch />, description: 'Format 3D simple', supported: true },
        { id: 'gltf', name: 'glTF', icon: <FaRocket />, description: 'Format 3D web', supported: true }
      ]);
    }
  };

  // Charger les connecteurs
  const loadConnectors = async () => {
    try {
      setConnectorsLoading(true);
      const connectorsData = await integrationService.getConnectors();
      setConnectors(connectorsData);
    } catch (error) {
      console.error('Erreur lors du chargement des connecteurs:', error);
      showNotification('Erreur lors du chargement des connecteurs', 'error');
    } finally {
      setConnectorsLoading(false);
    }
  };

  // Charger l'historique
  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      
      // Sauvegarder l'historique local actuel avant de le recharger
      const currentLocalHistory = JSON.parse(localStorage.getItem('bim_operation_history') || '[]');
      
      const historyData = await integrationService.getOperationHistory(historyFilters);
      
      console.log('📋 Données d\'historique reçues:', historyData);
      console.log('📋 Historique local actuel:', currentLocalHistory.length, 'éléments');
      console.log('📋 Premiers éléments:', historyData.slice(0, 3).map(item => ({
        id: item.id,
        type: typeof item.id,
        source: item.source,
        fileName: item.fileName,
        status: item.status,
        date: item.date
      })));
      
      setHistory(historyData);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      showNotification('Erreur lors du chargement de l\'historique', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Charger les API externes
  const loadExternalApis = async () => {
    try {
      setApisLoading(true);
      const apisData = await integrationService.getExternalApis();
      setExternalApis(apisData);
    } catch (error) {
      console.error('Erreur lors du chargement des APIs externes:', error);
      showNotification('Erreur lors du chargement des APIs externes', 'error');
    } finally {
      setApisLoading(false);
    }
  };

  // Fonction pour obtenir l'icône selon le format
  const getFormatIcon = (formatId) => {
    const iconMap = {
      'ifc4': <FaLayerGroup />,
      'ifc2x3': <FaLayerGroup />,
      'dwg': <FaFileAlt />,
      'step': <FaCog />,
      'obj': <FaCodeBranch />,
      'gltf': <FaRocket />,
      'default': <FaFileAlt />
    };
    return iconMap[formatId] || iconMap.default;
  };

  // Supprimer un fichier de l'historique
  const deleteHistoryFile = async (fileId, fileName) => {
    try {
      console.log('🗑️ Demande de suppression:', { fileId, fileName, type: typeof fileId });
      
      // Vérifier que l'ID est valide
      if (!fileId || fileId === 'undefined' || fileId === 'null') {
        showNotification('ID de fichier invalide', 'error');
        return;
      }

      if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le fichier "${fileName}" ? Cette action est irréversible.`)) {
        return;
      }

      console.log('🔄 Appel du service de suppression...');
      const result = await integrationService.deleteHistoryFile(fileId);
      
      console.log('📥 Résultat du service:', result);
      
      if (result.success) {
        // Retirer de la liste locale
        setHistory(prev => prev.filter(item => item.id !== fileId));
        showNotification(result.message || 'Fichier supprimé avec succès', 'success');
      } else {
        showNotification(result.error || 'Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du fichier:', error);
      showNotification('Erreur lors de la suppression du fichier', 'error');
    }
  };

  // Vider tout l'historique
  const clearAllHistory = async () => {
    // Activer le mode danger et afficher la confirmation
    setDangerMode(true);
    setShowDeleteConfirm(true);
  };

  // Fonction pour confirmer la suppression
  const confirmDeleteAll = async () => {
    try {
      setShowDeleteConfirm(false);
      setLoading(true);
      
      const result = await integrationService.clearAllHistory();
      
      if (result.success) {
        setHistory([]);
        showNotification(result.message || 'Historique vidé avec succès', 'success');
      } else {
        showNotification(result.error || 'Erreur lors du vidage', 'error');
      }
    } catch (error) {
      console.error('Erreur lors du vidage de l\'historique:', error);
      showNotification('Erreur lors du vidage de l\'historique', 'error');
    } finally {
      setLoading(false);
      setDangerMode(false);
    }
  };

  // Fonction pour annuler la suppression
  const cancelDeleteAll = () => {
    setShowDeleteConfirm(false);
    setDangerMode(false);
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      dangerMode 
        ? 'bg-gradient-to-br from-red-900 via-red-800 to-red-900' 
        : darkMode 
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
          : 'bg-gradient-to-br from-slate-50 via-white to-indigo-50'
    }`}>
      {/* Overlay de danger */}
      {dangerMode && (
        <div className="absolute inset-0 bg-red-900/20 backdrop-blur-sm z-0 animate-pulse" />
      )}
      
      {/* Fond avec pattern subtil */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute inset-0 opacity-10 transition-all duration-500 ${
          dangerMode ? 'bg-red-800' : darkMode ? 'bg-slate-800' : 'bg-slate-100'
        }`} 
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, ${darkMode ? '#475569' : '#cbd5e1'} 2px, transparent 2px)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header moderne */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8"
          >
            <div className="flex items-center space-x-4 mb-4 lg:mb-0">
              <div className="relative">
                <div className={`absolute inset-0 rounded-xl blur-xl opacity-30 ${
                  dangerMode ? 'bg-red-500' : darkMode ? 'bg-indigo-500' : 'bg-indigo-400'
                }`} />
                <div className={`relative p-3 rounded-xl ${
                  dangerMode 
                    ? 'bg-red-600 animate-pulse' 
                    : darkMode ? 'bg-indigo-600' : 'bg-indigo-500'
                } text-white`}>
                  {dangerMode ? (
                    <FaExclamationTriangle className="text-2xl" />
                  ) : (
                    <FaExchangeAlt className="text-2xl" />
                  )}
                </div>
              </div>
              <div>
                <h1 className={`text-3xl font-bold tracking-tight ${
                  dangerMode 
                    ? 'text-red-500 animate-pulse' 
                    : darkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {dangerMode ? 'MODE DANGER ACTIVÉ' : 'Interopérabilité & Intégration'}
                </h1>
                <p className={`text-lg mt-1 ${
                  dangerMode 
                    ? 'text-red-400' 
                    : darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  {dangerMode ? 'Suppression d\'historique en cours...' : 'Gérez vos échanges de données et connecteurs'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' 
                    : 'bg-white hover:bg-slate-50 text-slate-600'
                } border ${
                  darkMode ? 'border-slate-700' : 'border-slate-200'
                }`}
                title={darkMode ? 'Mode clair' : 'Mode sombre'}
              >
                {darkMode ? <FaSun /> : <FaMoon />}
              </button>
            </div>
          </motion.div>

          {/* Système d'onglets moderne */}
          <div className={`rounded-2xl shadow-xl backdrop-blur-sm border transition-all duration-500 ${
            dangerMode 
              ? 'bg-red-900/50 border-red-700 ring-4 ring-red-500/50' 
              : darkMode 
                ? 'bg-slate-800/50 border-slate-700' 
                : 'bg-white/80 border-slate-200'
          } overflow-hidden`}>
            <Tab.Group 
              onChange={(index) => setActiveTab(index)} 
              defaultIndex={0}
            >
              <Tab.List className={`flex p-1 transition-all duration-500 ${
                dangerMode 
                  ? 'bg-red-900/50' 
                  : darkMode ? 'bg-slate-900/50' : 'bg-slate-50/80'
              }`}>
                {[
                  { name: 'Import/Export', icon: <FaExchangeAlt className="w-4 h-4" />, color: 'indigo' },
                  { name: 'Connecteurs', icon: <FaPlug className="w-4 h-4" />, color: 'blue' },
                  { name: 'Historique', icon: <FaHistory className="w-4 h-4" />, color: 'green' },
                  { name: 'API Externes', icon: <FaGlobe className="w-4 h-4" />, color: 'purple' }
                ].map((tab, idx) => (
                  <Tab
                    key={idx}
                    className={({ selected }) =>
                      `flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium leading-5 
                      rounded-lg transition-all duration-200 relative overflow-hidden
                      ${selected 
                        ? `${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'} shadow-md` 
                        : `${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'} hover:bg-slate-100/50 dark:hover:bg-slate-700/50`
                      }`
                    }
                  >
                    <span className="flex items-center space-x-2">
                      {tab.icon}
                      <span>{tab.name}</span>
                    </span>
                  </Tab>
                ))}
              </Tab.List>

              <Tab.Panels>
                {/* Panel Import/Export */}
                <Tab.Panel className="p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="import-export"
                      variants={tabVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="space-y-8"
                    >
                      {/* Résumé des formats supportés */}
                      <motion.div
                        variants={itemVariants}
                        className={`p-6 rounded-xl border ${
                          darkMode 
                            ? 'bg-slate-800/30 border-slate-700' 
                            : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'
                        }`}
                      >
                        <h3 className={`text-lg font-semibold mb-4 ${
                          darkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          Formats supportés
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          {exchangeFormats.map((format) => (
                            <motion.div
                              key={format.id}
                              whileHover={{ scale: 1.05 }}
                              className={`p-4 rounded-lg text-center transition-all ${
                                darkMode 
                                  ? 'bg-slate-700/50 hover:bg-slate-700' 
                                  : 'bg-white hover:bg-slate-50'
                              } border ${
                                darkMode ? 'border-slate-600' : 'border-slate-200'
                              }`}
                            >
                              <div className={`text-2xl mb-2 ${
                                format.supported ? 'text-green-500' : 'text-gray-400'
                              }`}>
                                {format.icon}
                              </div>
                              <div className={`font-medium text-sm ${
                                darkMode ? 'text-slate-200' : 'text-slate-800'
                              }`}>
                                {format.name}
                              </div>
                              <div className={`text-xs mt-1 ${
                                darkMode ? 'text-slate-400' : 'text-slate-500'
                              }`}>
                                {format.description}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>

                      {/* Grille Import/Export */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {/* Section Import */}
                        <motion.div
                          variants={itemVariants}
                          className={`p-6 rounded-xl border ${
                            darkMode 
                              ? 'bg-slate-800/30 border-slate-700' 
                              : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-emerald-500 rounded-lg">
                              <FaFileImport className="text-white text-xl" />
                            </div>
                            <h2 className={`text-xl font-semibold ${
                              darkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                              Importation
                            </h2>
                          </div>
                          
                          <form onSubmit={handleImport} className="space-y-6">
                            {/* Sélection de source */}
                            <div>
                              <label className={`block text-sm font-medium mb-3 ${
                                darkMode ? 'text-slate-300' : 'text-slate-700'
                              }`}>
                                Source des données
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setImportForm(prev => ({ ...prev, sourceType: 'file' }))}
                                  className={`p-4 rounded-lg border transition-all ${
                                    importForm.sourceType === 'file' 
                                      ? 'bg-emerald-500 text-white border-emerald-500' 
                                      : `${darkMode ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-white text-slate-700 border-slate-300'} hover:border-emerald-400`
                                  }`}
                                >
                                  <FaUpload className="mx-auto mb-2" />
                                  <span className="text-sm font-medium">Fichier local</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setImportForm(prev => ({ ...prev, sourceType: 'url' }))}
                                  className={`p-4 rounded-lg border transition-all ${
                                    importForm.sourceType === 'url' 
                                      ? 'bg-emerald-500 text-white border-emerald-500' 
                                      : `${darkMode ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-white text-slate-700 border-slate-300'} hover:border-emerald-400`
                                  }`}
                                >
                                  <FaLink className="mx-auto mb-2" />
                                  <span className="text-sm font-medium">URL</span>
                                </button>
                              </div>
                            </div>

                            {/* Sélection de format */}
                            <div>
                              <label className={`block text-sm font-medium mb-2 ${
                                darkMode ? 'text-slate-300' : 'text-slate-700'
                              }`}>
                                Format
                              </label>
                              <select
                                value={importForm.format}
                                onChange={e => setImportForm(prev => ({ ...prev, format: e.target.value }))}
                                className={`w-full p-3 rounded-lg border transition-all ${
                                  darkMode 
                                    ? 'bg-slate-700 border-slate-600 text-white' 
                                    : 'bg-white border-slate-300 text-slate-900'
                                } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                              >
                                {exchangeFormats.map(format => (
                                  <option key={format.id} value={format.id}>
                                    {format.name} - {format.description}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Zone de fichier ou URL */}
                            {importForm.sourceType === 'file' ? (
                              <div>
                                <label className={`block text-sm font-medium mb-2 ${
                                  darkMode ? 'text-slate-300' : 'text-slate-700'
                                }`}>
                                  Fichier à importer
                                </label>
                                <div className="relative">
                                  <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                                    importForm.file 
                                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                                      : `${darkMode ? 'border-slate-600 bg-slate-800/50' : 'border-slate-300 bg-slate-50'} hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10`
                                  }`}>
                                    <div className="flex flex-col items-center justify-center pt-7">
                                      <FaCloudUploadAlt className={`w-12 h-12 mb-4 ${
                                        importForm.file ? 'text-emerald-500' : 'text-slate-400'
                                      }`} />
                                      <p className={`text-sm font-medium ${
                                        darkMode ? 'text-slate-300' : 'text-slate-700'
                                      }`}>
                                        {importForm.file 
                                          ? `Fichier sélectionné: ${importForm.file.name}` 
                                          : 'Glisser-déposer ou cliquer pour sélectionner'
                                        }
                                      </p>
                                      {importForm.file && (
                                        <p className="text-xs text-slate-500 mt-1">
                                          Taille: {(importForm.file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                      )}
                                    </div>
                                    <input 
                                      type="file" 
                                      className="opacity-0 absolute inset-0 cursor-pointer" 
                                      onChange={handleFileChange}
                                      accept=".ifc,.dwg,.step,.obj,.gltf,.json,.csv"
                                    />
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <label className={`block text-sm font-medium mb-2 ${
                                  darkMode ? 'text-slate-300' : 'text-slate-700'
                                }`}>
                                  URL du fichier
                                </label>
                                <input
                                  type="url"
                                  placeholder="https://example.com/model.ifc"
                                  value={importForm.url}
                                  onChange={e => setImportForm(prev => ({ ...prev, url: e.target.value }))}
                                  className={`w-full p-3 rounded-lg border transition-all ${
                                    darkMode 
                                      ? 'bg-slate-700 border-slate-600 text-white' 
                                      : 'bg-white border-slate-300 text-slate-900'
                                  } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                                />
                              </div>
                            )}

                            {/* Options avancées */}
                            <div className="space-y-3">
                              <label className={`block text-sm font-medium ${
                                darkMode ? 'text-slate-300' : 'text-slate-700'
                              }`}>
                                Options d'importation
                              </label>
                              
                              <div className="grid grid-cols-1 gap-3">
                                {[
                                  { key: 'validateGeometry', label: 'Valider la géométrie' },
                                  { key: 'importProperties', label: 'Importer les propriétés' },
                                  { key: 'importMaterials', label: 'Importer les matériaux' },
                                  { key: 'generateThumbnails', label: 'Générer des miniatures' },
                                  { key: 'preserveHierarchy', label: 'Préserver la hiérarchie' }
                                ].map(({ key, label }) => (
                                  <label key={key} className="flex items-center space-x-3 cursor-pointer">
                                    <Switch
                                      checked={importForm.options[key]}
                                      onChange={(checked) => setImportForm(prev => ({
                                        ...prev,
                                        options: { ...prev.options, [key]: checked }
                                      }))}
                                      className={`${
                                        importForm.options[key] ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                      } relative inline-flex h-5 w-9 items-center rounded-full transition-colors`}
                                    >
                                      <span
                                        className={`${
                                          importForm.options[key] ? 'translate-x-5' : 'translate-x-1'
                                        } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                                      />
                                    </Switch>
                                    <span className={`text-sm ${
                                      darkMode ? 'text-slate-300' : 'text-slate-700'
                                    }`}>
                                      {label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Affichage d'erreur */}
                            {showError && errorMessage && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                              >
                                <div className="flex items-center">
                                  <FaExclamationTriangle className="w-4 h-4 text-red-500 mr-2" />
                                  <span className="text-sm text-red-700 dark:text-red-400">{errorMessage}</span>
                                  <button
                                    onClick={() => setShowError(false)}
                                    className="ml-auto text-red-500 hover:text-red-700 dark:hover:text-red-300"
                                  >
                                    <FaTimes className="w-4 h-4" />
                                  </button>
                                </div>
                              </motion.div>
                            )}

                            {/* Bouton d'import */}
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="submit"
                              disabled={loading}
                              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-4 px-6 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span>Importation en cours...</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center space-x-2">
                                  <FaCloudUploadAlt />
                                  <span>Démarrer l'importation</span>
                                </div>
                              )}
                            </motion.button>
                          </form>
                        </motion.div>

                        {/* Section Export */}
                        <motion.div
                          variants={itemVariants}
                          className={`p-6 rounded-xl border ${
                            darkMode 
                              ? 'bg-slate-800/30 border-slate-700' 
                              : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-blue-500 rounded-lg">
                              <FaFileExport className="text-white text-xl" />
                            </div>
                            <h2 className={`text-xl font-semibold ${
                              darkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                              Exportation
                            </h2>
                          </div>
                          
                          <form onSubmit={handleExport} className="space-y-6">
                            {/* Sélection de format */}
                            <div>
                              <label className={`block text-sm font-medium mb-2 ${
                                darkMode ? 'text-slate-300' : 'text-slate-700'
                              }`}>
                                Format d'export
                              </label>
                              <select
                                value={exportForm.format}
                                onChange={e => setExportForm(prev => ({ ...prev, format: e.target.value }))}
                                className={`w-full p-3 rounded-lg border transition-all ${
                                  darkMode 
                                    ? 'bg-slate-700 border-slate-600 text-white' 
                                    : 'bg-white border-slate-300 text-slate-900'
                                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                              >
                                {exchangeFormats.map(format => (
                                  <option key={format.id} value={format.id}>
                                    {format.name} - {format.description}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Options d'export */}
                            <div className="space-y-3">
                              <label className={`block text-sm font-medium ${
                                darkMode ? 'text-slate-300' : 'text-slate-700'
                              }`}>
                                Options d'exportation
                              </label>
                              
                              <div className="grid grid-cols-1 gap-3">
                                {[
                                  { key: 'includeProperties', label: 'Inclure les propriétés' },
                                  { key: 'includeMaterials', label: 'Inclure les matériaux' },
                                  { key: 'includeGeometry', label: 'Inclure la géométrie' }
                                ].map(({ key, label }) => (
                                  <label key={key} className="flex items-center space-x-3 cursor-pointer">
                                    <Switch
                                      checked={exportForm[key]}
                                      onChange={(checked) => setExportForm(prev => ({
                                        ...prev,
                                        [key]: checked
                                      }))}
                                      className={`${
                                        exportForm[key] ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                                      } relative inline-flex h-5 w-9 items-center rounded-full transition-colors`}
                                    >
                                      <span
                                        className={`${
                                          exportForm[key] ? 'translate-x-5' : 'translate-x-1'
                                        } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                                      />
                                    </Switch>
                                    <span className={`text-sm ${
                                      darkMode ? 'text-slate-300' : 'text-slate-700'
                                    }`}>
                                      {label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Bouton d'export */}
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="submit"
                              disabled={loading}
                              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white py-4 px-6 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span>Exportation en cours...</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center space-x-2">
                                  <FaDownload />
                                  <span>Démarrer l'exportation</span>
                                </div>
                              )}
                            </motion.button>
                          </form>
                        </motion.div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </Tab.Panel>

                {/* Panel Connecteurs */}
                <Tab.Panel className="p-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                  >
                    {/* Header avec bouton d'ajout */}
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          Connecteurs disponibles
                        </h3>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Gérez vos connexions aux outils BIM et CAD
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowConnectorModal(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        <FaPlus className="w-4 h-4" />
                        <span>Ajouter un connecteur</span>
                      </motion.button>
                    </div>

                    {/* Grille des connecteurs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {connectors.map((connector) => (
                        <motion.div
                          key={connector.id}
                          whileHover={{ y: -5 }}
                          className={`p-6 rounded-xl border transition-all ${
                            darkMode 
                              ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' 
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          } shadow-lg hover:shadow-xl`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${
                                connector.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                              }`}>
                                <FaPlug className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {connector.name}
                                </h4>
                                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {connector.type}
                                </p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              connector.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                              {connector.status === 'active' ? 'Actif' : 'Inactif'}
                            </span>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Version:</span>
                              <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{connector.version}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Dernière sync:</span>
                              <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{formatDate(connector.lastSync)}</span>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <button
                              onClick={() => toggleConnector(connector.id)}
                              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                connector.status === 'active' 
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400' 
                                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                              }`}
                            >
                              {connector.status === 'active' ? 'Désactiver' : 'Activer'}
                            </button>
                            <button
                              onClick={() => syncConnector(connector.id)}
                              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                darkMode 
                                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              <FaSync className="w-3 h-3 inline mr-1" />
                              Sync
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Statistiques */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-green-50'}`}>
                        <div className="flex items-center">
                          <FaCheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Connecteurs actifs
                          </span>
                        </div>
                        <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {connectors.filter(c => c.status === 'active').length}
                        </p>
                      </div>
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-yellow-50'}`}>
                        <div className="flex items-center">
                          <FaExclamationTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Connecteurs inactifs
                          </span>
                        </div>
                        <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {connectors.filter(c => c.status === 'inactive').length}
                        </p>
                      </div>
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-purple-50'}`}>
                        <div className="flex items-center">
                          <FaPlug className="w-5 h-5 text-purple-500 mr-2" />
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Total connecteurs
                          </span>
                        </div>
                        <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {connectors.length}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </Tab.Panel>

                {/* Panel Historique */}
                <Tab.Panel className="p-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                  >
                    {/* Header avec filtres */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                      <div>
                        <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          Historique des opérations
                        </h3>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Suivez toutes vos opérations d'import/export
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          darkMode 
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}>
                          <FaFilter className="w-4 h-4 inline mr-1" />
                          Filtrer
                        </button>
                        <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          darkMode 
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}>
                          <FaDownload className="w-4 h-4 inline mr-1" />
                          Exporter
                        </button>
                        {history.length > 0 && (
                          <button
                            onClick={clearAllHistory}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                              dangerMode 
                                ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse ring-4 ring-red-300' 
                                : darkMode 
                                  ? 'bg-red-700 text-red-300 hover:bg-red-600' 
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                            title="Vider tout l'historique"
                            disabled={dangerMode}
                          >
                            <FaTrash className="w-4 h-4 inline mr-1" />
                            Vider l'historique
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Statistiques rapides */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-green-50'}`}>
                        <div className="flex items-center">
                          <FaCheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Réussies
                          </span>
                        </div>
                        <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {history.filter(h => h.status === 'success').length}
                        </p>
                      </div>
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-yellow-50'}`}>
                        <div className="flex items-center">
                          <FaExclamationTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Avec alertes
                          </span>
                        </div>
                        <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {history.filter(h => h.status === 'warning').length}
                        </p>
                      </div>
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-red-50'}`}>
                        <div className="flex items-center">
                          <FaExclamationTriangle className="w-5 h-5 text-red-500 mr-2" />
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Échecs
                          </span>
                        </div>
                        <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {history.filter(h => h.status === 'failed').length}
                        </p>
                      </div>
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-blue-50'}`}>
                        <div className="flex items-center">
                          <FaHistory className="w-5 h-5 text-blue-500 mr-2" />
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Total
                          </span>
                        </div>
                        <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {history.length}
                        </p>
                      </div>
                    </div>

                    {/* Table de l'historique */}
                    <div className={`rounded-xl border overflow-hidden ${
                      darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className={`${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                            <tr>
                              <th className={`text-left p-4 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                Type
                              </th>
                              <th className={`text-left p-4 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                Source/Destination
                              </th>
                              <th className={`text-left p-4 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                Date
                              </th>
                              <th className={`text-left p-4 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                Statut
                              </th>
                              <th className={`text-left p-4 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                Taille
                              </th>
                              <th className={`text-left p-4 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                Éléments
                              </th>
                              <th className={`text-left p-4 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                            {history.map((item) => (
                              <motion.tr
                                key={item.id}
                                whileHover={{ backgroundColor: darkMode ? 'rgb(51 65 85 / 0.3)' : 'rgb(248 250 252)' }}
                                className="transition-colors"
                              >
                                <td className="p-4">
                                  <div className="flex items-center">
                                    {item.type === 'import' ? (
                                      <FaFileImport className="w-4 h-4 text-green-500 mr-2" />
                                    ) : (
                                      <FaFileExport className="w-4 h-4 text-blue-500 mr-2" />
                                    )}
                                    <span className={`capitalize ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                      {item.type}
                                    </span>
                                  </div>
                                </td>
                                <td className={`p-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {item.source || item.destination || 'N/A'}
                                </td>
                                <td className={`p-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {formatDate(item.date)}
                                </td>
                                <td className="p-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    item.status === 'success' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                      : item.status === 'warning' 
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' 
                                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                  }`}>
                                    {item.status === 'success' ? 'Réussi' : 
                                     item.status === 'warning' ? 'Alertes' : 'Échec'}
                                  </span>
                                </td>
                                <td className={`p-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {item.details?.fileSize || item.size || 'N/A'}
                                </td>
                                <td className={`p-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {item.details?.elements ? item.details.elements.toLocaleString() : 'N/A'}
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => {
                                        setSelectedHistoryItem(item);
                                        setShowHistoryModal(true);
                                      }}
                                      className={`text-blue-500 hover:text-blue-700 transition-colors p-1 rounded`}
                                      title="Voir les détails"
                                    >
                                      <FaInfoCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteHistoryFile(item.id, item.source || item.destination || 'fichier')}
                                      className={`text-red-500 hover:text-red-700 transition-colors p-1 rounded`}
                                      title="Supprimer"
                                    >
                                      <FaTrash className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                </Tab.Panel>

                {/* Panel API Externes */}
                <Tab.Panel className="p-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                  >
                    {/* Header avec bouton d'ajout */}
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          API Externes
                        </h3>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Configurez vos connexions aux services externes
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowApiModal(true)}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        <FaPlus className="w-4 h-4" />
                        <span>Ajouter une API</span>
                      </motion.button>
                    </div>

                    {/* Grille des APIs */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {externalApis.map((api) => (
                        <motion.div
                          key={api.id}
                          whileHover={{ y: -5 }}
                          className={`p-6 rounded-xl border transition-all ${
                            darkMode 
                              ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' 
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          } shadow-lg hover:shadow-xl`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${
                                api.status === 'connected' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                              }`}>
                                <FaGlobe className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {api.name}
                                </h4>
                                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {api.type}
                                </p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              api.status === 'connected' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {api.status === 'connected' ? 'Connecté' : 'Déconnecté'}
                            </span>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>URL:</span>
                              <span className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-700'} truncate max-w-48`}>
                                {api.url}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Dernier test:</span>
                              <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{formatDate(api.lastTest)}</span>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <button
                              onClick={() => testExternalApi(api.id)}
                              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                darkMode 
                                  ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/30' 
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              <FaPlay className="w-3 h-3 inline mr-1" />
                              Tester
                            </button>
                            <button
                              onClick={() => {
                                setApiConfigForm({
                                  id: api.id,
                                  name: api.name,
                                  url: api.url,
                                  apiKey: '',
                                  description: `API ${api.type}`
                                });
                                setShowApiModal(true);
                              }}
                              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                darkMode 
                                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              <FaEdit className="w-3 h-3 inline mr-1" />
                              Modifier
                            </button>
                            <button
                              onClick={() => deleteExternalApi(api.id)}
                              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                darkMode 
                                  ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' 
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              <FaTrash className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Statistiques et guide */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Statistiques */}
                      <div className={`p-6 rounded-xl border ${
                        darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
                      }`}>
                        <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          Statistiques
                        </h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              APIs connectées
                            </span>
                            <span className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                              {externalApis.filter(a => a.status === 'connected').length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              APIs déconnectées
                            </span>
                            <span className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                              {externalApis.filter(a => a.status === 'disconnected').length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              Total APIs
                            </span>
                            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {externalApis.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Guide rapide */}
                      <div className={`p-6 rounded-xl border ${
                        darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200'
                      }`}>
                        <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          Guide rapide
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <FaPlus className="w-4 h-4 text-purple-500 mr-2" />
                            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                              Ajoutez une nouvelle API
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <FaPlay className="w-4 h-4 text-blue-500 mr-2" />
                            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                              Testez la connexion
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <FaShieldAlt className="w-4 h-4 text-green-500 mr-2" />
                            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                              Gérez les clés API
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <FaSync className="w-4 h-4 text-orange-500 mr-2" />
                            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                              Synchronisez les données
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </div>
        </div>
      </div>

      {/* Modal de résultats d'importation */}
      <Transition appear show={showResultsModal} as={React.Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowResultsModal(false)}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all ${
                  darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
                }`}>
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 mb-4">
                    Résultats d'importation
                  </Dialog.Title>
                  {importResults && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <div className="text-sm text-slate-500">Éléments importés</div>
                          <div className="text-xl font-semibold">{importResults.elements}</div>
                        </div>
                        <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <div className="text-sm text-slate-500">Temps de traitement</div>
                          <div className="text-xl font-semibold">{importResults.processingTime}s</div>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span>Avertissements:</span>
                        <span className="text-yellow-500">{importResults.warnings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Erreurs:</span>
                        <span className="text-red-500">{importResults.errors}</span>
                      </div>
                    </div>
                  )}
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setShowResultsModal(false)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* Modal des détails d'une opération */}
      <Transition appear show={showDetailsModal} as={React.Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowDetailsModal(false)}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className={`w-full max-w-4xl transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all ${
                  darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
                }`}>
                  <Dialog.Title
                    as="h3"
                    className={`text-lg font-medium leading-6 mb-4 ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {operationDetails?.type === 'import' ? (
                      <><FaFileImport className="me-2" /> Détails d'importation</>
                    ) : (
                      <><FaFileExport className="me-2" /> Détails d'exportation</>
                    )}
                  </Dialog.Title>
          {operationDetails && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                <h5 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">Informations générales</h5>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">ID de l'opération</td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{operationDetails.id}</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Type</td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                          {operationDetails.type === 'import' ? (
                            <span><FaFileImport className="me-2" /> Import</span>
                          ) : (
                            <span><FaFileExport className="me-2" /> Export</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Format</td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                          <strong>{operationDetails.format || 'N/A'}</strong>
                          {operationDetails.format === 'ifc4' && <span className="ml-2 text-slate-500">IFC4</span>}
                          {operationDetails.format === 'ifc2x3' && <span className="ml-2 text-slate-500">IFC2x3</span>}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                          {operationDetails.type === 'import' ? 'Source' : 'Destination'}
                        </td>
                        <td>
                          <strong>
                            {operationDetails.source || operationDetails.destination || 'N/A'}
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Date</td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{formatDate(operationDetails.date)}</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Utilisateur</td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{operationDetails.user}</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Statut</td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            operationDetails.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 
                            operationDetails.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : 
                            operationDetails.status === 'processing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {operationDetails.status === 'success' ? 'Réussi' : 
                             operationDetails.status === 'failed' ? 'Échoué' : 
                             operationDetails.status === 'processing' ? 'En cours' : operationDetails.status}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              {operationDetails.type === 'import' && operationDetails.status === 'success' && operationDetails.details && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                  <h5 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">Résultats de l'importation</h5>
                  <div className="space-y-4">
                    {operationDetails.details.projectName && (
                      <p><strong>Nom du projet:</strong> {operationDetails.details.projectName}</p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      {operationDetails.details.elements && (
                        <div className="md:col-span-1">
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{operationDetails.details.elements}</div>
                            <div className="text-sm text-blue-700 dark:text-blue-300">Éléments</div>
                          </div>
                        </div>
                      )}
                      
                      {operationDetails.details.properties && (
                        <div className="md:col-span-1">
                          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{operationDetails.details.properties}</div>
                            <div className="text-sm text-green-700 dark:text-green-300">Propriétés</div>
                          </div>
                        </div>
                      )}
                      
                      {operationDetails.details.warnings !== undefined && (
                        <div className="md:col-span-1">
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{operationDetails.details.warnings}</div>
                            <div className="text-sm text-yellow-700 dark:text-yellow-300">Avertissements</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {operationDetails.details.stats && (
                      <div className="mt-4">
                        <p className="font-semibold text-slate-900 dark:text-white">Statistiques:</p>
                        <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                          {operationDetails.details.stats.wallCount !== undefined && (
                            <li>Murs: {operationDetails.details.stats.wallCount}</li>
                          )}
                          {operationDetails.details.stats.doorCount !== undefined && (
                            <li>Portes: {operationDetails.details.stats.doorCount}</li>
                          )}
                          {operationDetails.details.stats.windowCount !== undefined && (
                            <li>Fenêtres: {operationDetails.details.stats.windowCount}</li>
                          )}
                          {operationDetails.details.stats.floorCount !== undefined && (
                            <li>Planchers/Dalles: {operationDetails.details.stats.floorCount}</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {operationDetails.status === 'failed' && operationDetails.error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h6 className="font-semibold text-red-800 dark:text-red-200 mb-2">Erreur</h6>
                  <p className="text-sm text-red-700 dark:text-red-300">{operationDetails.error}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-6 flex justify-end space-x-3">
            {operationDetails?.type === 'import' && operationDetails?.status === 'success' && (
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                onClick={() => {
                  setShowDetailsModal(false);
                  // Reconstruire les résultats pour afficher le modal
                  setImportResults({
                    fileName: operationDetails.source,
                    fileSize: operationDetails.details?.fileSize || 'N/A',
                    format: operationDetails.format,
                    source: operationDetails.source || 'client',
                    projectName: operationDetails.details?.projectName || 'Inconnu',
                    projectDescription: operationDetails.details?.projectDescription || 'Aucune description',
                    elements: operationDetails.details?.elements || 0,
                    properties: operationDetails.details?.properties || 0,
                    warningsCount: operationDetails.details?.warnings || 0,
                    entityCounts: operationDetails.details?.entityCounts || {},
                    stats: operationDetails.details?.stats || {},
                    timestamp: operationDetails.date,
                    warnings: operationDetails.details?.importWarnings || [],
                    serverUpload: !!operationDetails.details?.serverFileId,
                    localOnly: operationDetails.details?.localOnly || false
                  });
                  setShowResultsModal(true);
                }}
              >
                Voir résultats détaillés
              </button>
            )}
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 border border-transparent rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
              onClick={() => setShowDetailsModal(false)}
            >
              Fermer
            </button>
          </div>
        </Dialog.Panel>
      </Transition.Child>
    </div>
  </div>
</Dialog>
</Transition>
      
      {/* Modal de configuration d'API */}
      <Transition appear show={showApiModal} as={React.Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowApiModal(false)}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all ${
                  darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
                }`}>
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 mb-4 flex items-center">
                    <FaCogs className="mr-2" /> 
                    {apiConfigForm.id ? 'Configurer l\'API' : 'Ajouter une API externe'}
                  </Dialog.Title>
                  
                  <form className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Nom de l'API
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={apiConfigForm.name}
                        onChange={(e) => setApiConfigForm({...apiConfigForm, name: e.target.value})}
                        placeholder="Nom de l'API"
                        className={`w-full p-3 rounded-lg border transition-all ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        URL du service
                      </label>
                      <input
                        type="text"
                        name="url"
                        value={apiConfigForm.url}
                        onChange={(e) => setApiConfigForm({...apiConfigForm, url: e.target.value})}
                        placeholder="https://api.exemple.com/v1"
                        className={`w-full p-3 rounded-lg border transition-all ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Clé API
                      </label>
                      <input
                        type="password"
                        name="apiKey"
                        value={apiConfigForm.apiKey}
                        onChange={(e) => setApiConfigForm({...apiConfigForm, apiKey: e.target.value})}
                        placeholder="Votre clé API"
                        className={`w-full p-3 rounded-lg border transition-all ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Description
                      </label>
                      <textarea
                        rows={3}
                        name="description"
                        value={apiConfigForm.description}
                        onChange={(e) => setApiConfigForm({...apiConfigForm, description: e.target.value})}
                        placeholder="Description de cette API et son utilisation"
                        className={`w-full p-3 rounded-lg border transition-all ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      />
                    </div>
                  </form>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowApiModal(false)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        darkMode 
                          ? 'bg-slate-600 text-white hover:bg-slate-500' 
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveApiConfig(apiConfigForm);
                        setShowApiModal(false);
                      }}
                      className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Enregistrer
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* Modal des détails de l'historique */}
      <Transition appear show={showHistoryModal} as={React.Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowHistoryModal(false)}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className={`w-full max-w-2xl transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all ${
                  darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
                }`}>
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 mb-4 flex items-center">
                    {selectedHistoryItem?.type === 'import' ? (
                      <FaFileImport className="mr-2 text-green-500" />
                    ) : (
                      <FaFileExport className="mr-2 text-blue-500" />
                    )}
                    Détails de l'opération
                  </Dialog.Title>
                  
                  {selectedHistoryItem && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Type:</span>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {selectedHistoryItem.type === 'import' ? 'Importation' : 'Exportation'}
                          </p>
                        </div>
                        <div>
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Fichier:</span>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {selectedHistoryItem.file || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Date:</span>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {selectedHistoryItem.date ? formatDate(selectedHistoryItem.date) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Taille:</span>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {selectedHistoryItem.size || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Éléments:</span>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {selectedHistoryItem.elements ? selectedHistoryItem.elements.toLocaleString() : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Statut:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            selectedHistoryItem.status === 'success' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                              : selectedHistoryItem.status === 'warning' 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {selectedHistoryItem.status === 'success' ? 'Réussi' : 
                             selectedHistoryItem.status === 'warning' ? 'Avec alertes' : 
                             selectedHistoryItem.status === 'failed' ? 'Échec' : 'Inconnu'}
                          </span>
                        </div>
                      </div>
                      
                      {selectedHistoryItem && selectedHistoryItem.status === 'warning' && (
                        <div className={`p-4 rounded-lg border ${
                          darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          <h4 className={`font-medium mb-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>
                            Avertissements
                          </h4>
                          <ul className={`text-sm space-y-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                            <li>• Géométrie simplifiée détectée</li>
                            <li>• Propriétés manquantes sur certains éléments</li>
                            <li>• Format de coordonnées non standard</li>
                          </ul>
                        </div>
                      )}
                      
                      {selectedHistoryItem && selectedHistoryItem.status === 'failed' && (
                        <div className={`p-4 rounded-lg border ${
                          darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
                        }`}>
                          <h4 className={`font-medium mb-2 ${darkMode ? 'text-red-400' : 'text-red-800'}`}>
                            Erreur
                          </h4>
                          <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                            Fichier corrompu ou format non supporté. Veuillez vérifier l'intégrité du fichier et réessayer.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setShowHistoryModal(false)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal d'ajout de connecteur */}
      <Transition appear show={showConnectorModal} as={React.Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowConnectorModal(false)}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all ${
                  darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
                }`}>
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 mb-4 flex items-center">
                    <FaPlug className="mr-2 text-blue-500" />
                    Ajouter un nouveau connecteur
                  </Dialog.Title>
                  
                  <form className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Nom du connecteur
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Autodesk Revit"
                        className={`w-full p-3 rounded-lg border transition-all ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Type
                      </label>
                      <select
                        className={`w-full p-3 rounded-lg border transition-all ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      >
                        <option value="BIM">BIM</option>
                        <option value="CAD">CAD</option>
                        <option value="3D">3D</option>
                        <option value="Cloud">Cloud</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Version
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 2.1.0"
                        className={`w-full p-3 rounded-lg border transition-all ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      />
                    </div>
                  </form>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowConnectorModal(false)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        darkMode 
                          ? 'bg-slate-600 text-white hover:bg-slate-500' 
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Ici vous pourriez ajouter la logique pour créer le connecteur
                        setShowConnectorModal(false);
                        showNotification('Connecteur ajouté avec succès!', 'success');
                      }}
                      className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Ajouter
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal de confirmation de suppression de l'historique */}
      <Transition appear show={showDeleteConfirm} as={React.Fragment}>
        <Dialog as="div" className="relative z-50" onClose={cancelDeleteAll}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all border-4 border-red-500">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center animate-pulse">
                      <FaExclamationTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-bold leading-6 text-red-600 dark:text-red-400 text-center mb-4"
                  >
                    ⚠️ ZONE DE DANGER
                  </Dialog.Title>
                  
                  <div className="mt-2 space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                        Vous êtes sur le point de supprimer TOUT l'historique d'import/export !
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Cette action va supprimer :
                      </p>
                      <ul className="text-sm text-slate-600 dark:text-slate-300 list-disc list-inside space-y-1">
                        <li>Tous les imports de fichiers IFC</li>
                        <li>Tous les exports effectués</li>
                        <li>Toutes les données et statistiques</li>
                        <li>L'historique complet des opérations</li>
                      </ul>
                    </div>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                        ⚠️ Cette action est IRRÉVERSIBLE !
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center space-x-4">
                    <button
                      type="button"
                      onClick={cancelDeleteAll}
                      className="px-6 py-2 text-sm font-medium bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center"
                    >
                      <FaTimes className="w-4 h-4 mr-2" />
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteAll}
                      className="px-6 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center animate-pulse"
                    >
                      <FaTrash className="w-4 h-4 mr-2" />
                      Oui, tout supprimer
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default InteroperabilityPage;
