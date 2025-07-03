import React, { useState, useContext, useEffect } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { AuthContext } from '../../context/AuthContext';
import { Card, Tabs, Tab, Alert, Button, Form, InputGroup, Spinner, Modal, Table, Badge } from 'react-bootstrap';
import { FaExchangeAlt, FaPlug, FaCloudUploadAlt, FaFileImport, FaFileExport, FaCogs, FaDatabase, FaSync, FaLink, FaExclamationTriangle, FaBuilding, FaDoorOpen, FaWindowRestore, FaPlus, FaTrash, FaInfoCircle, FaExternalLinkAlt } from 'react-icons/fa';
import { integrationService } from '../../services/integrationService';
import styles from './Integration.module.css';

const InteroperabilityPage = () => {
  const { texts } = useContext(LanguageContext);
  const { isAuthenticated, userData } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('import-export');
  const [loading, setLoading] = useState(false);
  const [loadingSection, setLoadingSection] = useState(null); // Pour charger des sections spécifiques
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  // États pour les données dynamiques
  const [availableConnectors, setAvailableConnectors] = useState([]);
  const [exchangeFormats, setExchangeFormats] = useState([]);
  const [integrationHistory, setIntegrationHistory] = useState([]);
  const [externalApis, setExternalApis] = useState([]);
  
  // État pour le modal de configuration d'API
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiConfigForm, setApiConfigForm] = useState({
    id: '',
    name: '',
    url: '',
    apiKey: '',
    description: ''
  });

  // État pour les résultats d'importation IFC
  const [importResults, setImportResults] = useState(null);
  const [showResultsModal, setShowResultsModal] = useState(false);

  // État pour le formulaire d'importation
  const [importForm, setImportForm] = useState({
    sourceType: 'file',
    format: 'ifc4',
    file: null,
    url: '',
    options: { validateGeometry: true, importProperties: true }
  });

  // État pour le formulaire d'exportation
  const [exportForm, setExportForm] = useState({
    format: 'ifc4',
    target: 'file',
    includeProperties: true,
    includeMaterials: true,
    destination: ''
  });

  // État pour les détails de l'opération
  const [operationDetails, setOperationDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Chargement initial des données
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingSection('all');
        
        // Charger les données en parallèle
        const [formatsData, connectorsData] = await Promise.all([
          integrationService.getExchangeFormats(),
          integrationService.getConnectors()
        ]);
        
        setExchangeFormats(formatsData);
        setAvailableConnectors(connectorsData);
        
        // Définir le format par défaut
        if (formatsData.length > 0) {
          setImportForm(prev => ({ ...prev, format: formatsData[0].id }));
          setExportForm(prev => ({ ...prev, format: formatsData[0].id }));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données initiales:', error);
        showNotification('Erreur lors du chargement des données. Veuillez réessayer.', 'danger');
      } finally {
        setLoadingSection(null);
      }
    };
    
    loadInitialData();
  }, []);
  
  // Charger l'historique lorsque l'onglet est actif
  useEffect(() => {
    if (activeTab === 'history') {
      loadOperationHistory();
    }
  }, [activeTab]);
  
  // Charger les API externes lorsque l'onglet est actif
  useEffect(() => {
    if (activeTab === 'api') {
      loadExternalApis();
    }
  }, [activeTab]);
  
  // Fonction pour charger l'historique des opérations
  const loadOperationHistory = async () => {
    try {
      setLoadingSection('history');
      const historyData = await integrationService.getOperationHistory();
      setIntegrationHistory(historyData);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      showNotification('Impossible de charger l\'historique des opérations', 'danger');
    } finally {
      setLoadingSection(null);
    }
  };
  
  // Fonction pour charger les API externes
  const loadExternalApis = async () => {
    try {
      setLoadingSection('apis');
      const apisData = await integrationService.getExternalApis();
      setExternalApis(apisData);
    } catch (error) {
      console.error('Erreur lors du chargement des API externes:', error);
      showNotification('Impossible de charger les API externes', 'danger');
    } finally {
      setLoadingSection(null);
    }
  };

  // Afficher une notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 5000);
  };

  // Gérer l'importation réelle
  const handleImport = async (e) => {
    e.preventDefault();
    
    if (importForm.sourceType === 'file' && !importForm.file) {
      showNotification('Veuillez sélectionner un fichier à importer', 'warning');
      return;
    }
    
    if (importForm.sourceType === 'url' && !importForm.url) {
      showNotification('Veuillez entrer une URL valide', 'warning');
      return;
    }
    
    // Vérifier si c'est un fichier IFC
    const isIfcFile = importForm.file && 
                     (importForm.format === 'ifc2x3' || importForm.format === 'ifc4') &&
                     (importForm.file.name.toLowerCase().endsWith('.ifc') || importForm.file.name.toLowerCase().endsWith('.ifcxml'));
    
    if (isIfcFile) {
      console.log('Préparation au traitement du fichier IFC:', importForm.file.name);
    }
    
    try {
      setLoading(true);
      console.log('Début du processus d\'importation...');
      const result = await integrationService.importData(importForm);
      
      console.log('Résultat de l\'importation:', result);
      
      // Gérer les résultats avec différents niveaux de succès
      if (result.success) {
        // Cas de succès mais avec possibilité d'avertissements
        if (result.localOnly) {
          // Succès local uniquement (pas d'upload serveur)
          showNotification(
            'Importation locale réussie. Le fichier a été analysé mais n\'a pas pu être sauvegardé sur le serveur.',
            'info'
          );
        } else {
          // Succès complet
          showNotification(
            `Importation réussie! ${result.data?.elements || result.data?.totalElements || 0} éléments importés.`, 
            'success'
          );
        }
      } else {
        // Cas d'erreur
        showNotification(
          `Importation incomplète: ${result.error || 'Erreur inconnue'}`,
          'warning'
        );
      }
      
      // Si c'est un fichier IFC traité, stocker les résultats détaillés même en cas d'erreur partielle
      if ((result.success || (result.data && Object.keys(result.data).length > 0)) && 
         (importForm.format === 'ifc2x3' || importForm.format === 'ifc4') &&
         importForm.file && 
         (importForm.file.name.toLowerCase().endsWith('.ifc') || importForm.file.name.toLowerCase().endsWith('.ifcxml'))) {
        
        // Vérifier et préparer les données pour éviter les erreurs null/undefined
        const entityCounts = result.data?.entityCounts ? {...result.data.entityCounts} : {};
        const stats = result.data?.stats ? {...result.data.stats} : {};
        const totalElements = result.data?.totalElements || result.data?.elements || 0;
        
        console.log('Données IFC reçues:', { 
          entityCounts,
          stats,
          totalElements
        });
        
        // Préparer les avertissements pour l'utilisateur
        let importWarnings = [];
        
        if (result.warning) {
          importWarnings.push(result.warning);
        }
        
        if (result.error) {
          importWarnings.push(result.error);
        }
        
        if (result.localOnly) {
          importWarnings.push('Le fichier a été analysé localement mais n\'a pas pu être sauvegardé sur le serveur.');
        }
        
        if (Object.keys(entityCounts).length === 0 || result.metadata?.noEntitiesExtracted) {
          importWarnings.push('Aucune entité n\'a pu être extraite du modèle.');
        }
        
        // Vérifier si le schéma IFC a été utilisé avec succès
        if (result.schemaIssue || result.metadata?.schemaError) {
          importWarnings.push('Le schéma IFC n\'a pas pu être chargé complètement. L\'analyse pourrait être incomplète.');
        }
        
        // Informer si l'analyse n'est que locale
        if (!result.data?.fileId && !result.data?.serverFileId) {
          importWarnings.push('Le fichier a été traité localement uniquement. Aucune copie n\'est disponible sur le serveur.');
        }
        
        // Ajouter un avertissement spécifique pour les problèmes d'extraction d'entités
        if (result.entityExtractionFailed) {
          importWarnings.push('L\'extraction des entités a échoué. Le format du fichier pourrait ne pas être compatible avec la version actuelle du parser.');
        }
        
        // Stocker les résultats pour les afficher dans un modal
        setImportResults({
          fileName: importForm.file.name,
          fileSize: (importForm.file.size / (1024 * 1024)).toFixed(2) + ' MB',
          format: importForm.format,
          source: result.source || 'client',
          projectName: result.data?.projectName || 'Inconnu',
          projectDescription: result.data?.projectDescription || 'Aucune description',
          elements: result.data?.totalElements || result.data?.elements || 0,
          properties: result.data?.properties || 0,
          warningsCount: result.data?.warnings || 0,
          entityCounts: entityCounts,
          stats: stats,
          timestamp: new Date().toLocaleString(),
          sourceType: result.source || 'server',
          warnings: importWarnings.length > 0 ? importWarnings : null,
          serverUpload: !!result.data?.serverFileId || !!result.data?.fileId,
          schemaIssue: result.schemaIssue || false,
          localOnly: result.localOnly || false
        });
        
        // Afficher le modal des résultats
        setShowResultsModal(true);
      } else if (!result.success && result.error && result.error.includes('WebAssembly')) {
        // Gérer spécifiquement les erreurs WebAssembly
        showNotification(
          "Erreur de chargement des modules WebAssembly nécessaires. Veuillez recharger la page ou contacter l'administrateur.", 
          'danger'
        );
        console.error("Erreur WebAssembly détectée:", result.originalError || result.error);
      }
      
      // Recharger l'historique
      if (activeTab === 'history') {
        loadOperationHistory();
      }
    } catch (error) {
      console.error('Erreur d\'importation:', error);
      showNotification(
        `Erreur d'importation: ${error.message || 'Veuillez vérifier vos paramètres et réessayer'}`, 
        'danger'
      );
    } finally {
      setLoading(false);
    }
  };

  // Gérer l'exportation réelle
  const handleExport = async (e) => {
    e.preventDefault();
    
    if (exportForm.target === 'email' && !exportForm.destination) {
      showNotification('Veuillez entrer une adresse email valide', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      const result = await integrationService.exportData(exportForm);
      
      let message = 'Exportation terminée avec succès!';
      if (exportForm.target === 'file') {
        message += ' Le fichier a été téléchargé.';
      } else if (exportForm.target === 'email') {
        message += ` Un lien a été envoyé à ${exportForm.destination}.`;
      }
      
      showNotification(message, 'success');
      
      // Recharger l'historique
      if (activeTab === 'history') {
        loadOperationHistory();
      }
    } catch (error) {
      console.error('Erreur d\'exportation:', error);
      showNotification(
        `Erreur d'exportation: ${error.message || 'Veuillez vérifier vos paramètres et réessayer'}`,
        'danger'
      );
    } finally {
      setLoading(false);
    }
  };

  // Gérer le changement de fichier
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setImportForm({
        ...importForm,
        file: e.target.files[0]
      });
    }
  };

  // Gérer les changements dans le formulaire d'importation
  const handleImportFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setImportForm({
        ...importForm,
        options: {
          ...importForm.options,
          [name]: checked
        }
      });
    } else {
      setImportForm({
        ...importForm,
        [name]: value
      });
    }
  };

  // Gérer les changements dans le formulaire d'exportation
  const handleExportFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setExportForm({
        ...exportForm,
        [name]: checked
      });
    } else {
      setExportForm({
        ...exportForm,
        [name]: value
      });
    }
  };
  
  // Gérer le changement de statut d'un connecteur
  const handleConnectorStatusChange = async (connectorId, newStatus) => {
    try {
      setLoadingSection(`connector-${connectorId}`);
      
      const result = await integrationService.updateConnectorStatus(connectorId, newStatus);
      
      // Mettre à jour l'état local
      setAvailableConnectors(connectors => 
        connectors.map(c => 
          c.id === connectorId ? { ...c, status: newStatus } : c
        )
      );
      
      showNotification(
        `Connecteur ${availableConnectors.find(c => c.id === connectorId)?.name} ${newStatus === 'active' ? 'activé' : 'désactivé'} avec succès`,
        'success'
      );
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du connecteur ${connectorId}:`, error);
      showNotification(
        `Erreur lors de la mise à jour du connecteur: ${error.message || 'Veuillez réessayer'}`,
        'danger'
      );
    } finally {
      setLoadingSection(null);
    }
  };
  
  // Afficher les détails d'une opération
  const showOperationDetails = (operation) => {
    setOperationDetails(operation);
    setShowDetailsModal(true);
  };
  
  // Gérer la synchronisation avec une API externe
  const handleApiSync = async (apiId) => {
    try {
      setLoadingSection(`api-${apiId}`);
      
      const result = await integrationService.syncExternalApi(apiId);
      
      // Mettre à jour l'état local
      setExternalApis(apis => 
        apis.map(a => 
          a.id === apiId ? { 
            ...a, 
            status: 'connected', 
            lastSync: result.lastSync || new Date().toISOString(),
            error: null 
          } : a
        )
      );
      
      showNotification(
        `Synchronisation avec ${externalApis.find(a => a.id === apiId)?.name} réussie`,
        'success'
      );
    } catch (error) {
      console.error(`Erreur lors de la synchronisation avec l'API ${apiId}:`, error);
      
      // Mettre à jour l'état local avec l'erreur
      setExternalApis(apis => 
        apis.map(a => 
          a.id === apiId ? { 
            ...a, 
            status: 'error', 
            error: error.message || 'Erreur de synchronisation'
          } : a
        )
      );
      
      showNotification(
        `Erreur lors de la synchronisation: ${error.message || 'Veuillez réessayer'}`,
        'danger'
      );
    } finally {
      setLoadingSection(null);
    }
  };
  
  // Ouvrir le modal de configuration d'API
  const openApiConfigModal = (api = null) => {
    if (api) {
      setApiConfigForm({
        id: api.id,
        name: api.name,
        url: api.url || '',
        apiKey: '',
        description: api.description || ''
      });
    } else {
      setApiConfigForm({
        id: '',
        name: '',
        url: '',
        apiKey: '',
        description: ''
      });
    }
    setShowApiModal(true);
  };
  
  // Gérer les changements dans le formulaire de configuration d'API
  const handleApiConfigFormChange = (e) => {
    const { name, value } = e.target;
    setApiConfigForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Soumettre la configuration d'API
  const handleApiConfigSubmit = async (e) => {
    e.preventDefault();
    
    if (!apiConfigForm.name || !apiConfigForm.url) {
      showNotification('Veuillez remplir tous les champs obligatoires', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await integrationService.configureExternalApi(apiConfigForm);
      
      // Mettre à jour la liste des API
      if (apiConfigForm.id) {
        // Mise à jour d'une API existante
        setExternalApis(apis => 
          apis.map(a => a.id === apiConfigForm.id ? result.api : a)
        );
      } else {
        // Ajout d'une nouvelle API
        setExternalApis(apis => [...apis, result.api]);
      }
      
      showNotification(
        apiConfigForm.id ? 'Configuration de l\'API mise à jour avec succès' : 'Nouvelle API configurée avec succès',
        'success'
      );
      
      setShowApiModal(false);
    } catch (error) {
      console.error('Erreur lors de la configuration de l\'API:', error);
      showNotification(
        `Erreur: ${error.message || 'Veuillez vérifier les informations saisies et réessayer'}`,
        'danger'
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Gérer la sauvegarde de la configuration d'une API
  const handleSaveApiConfig = async (configData) => {
    try {
      setLoadingSection(`api-save-${configData.id || 'new'}`);
      
      const result = await integrationService.saveApiConfig(configData);
      
      if (result.success) {
        showNotification('Configuration de l\'API enregistrée avec succès', 'success');
        
        // Mettre à jour la liste des API externes
        loadExternalApis();
      } else {
        showNotification(`Erreur lors de l'enregistrement: ${result.message}`, 'danger');
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'API:', error);
      showNotification('Erreur lors de l\'enregistrement de la configuration', 'danger');
    } finally {
      setLoadingSection(null);
    }
  };
  
  // Gérer la synchronisation avec une API externe
  const handleSyncApi = async (apiId) => {
    try {
      setLoadingSection(`api-sync-${apiId}`);
      
      const result = await integrationService.synchronizeApi(apiId);
      
      if (result.success) {
        showNotification(`Synchronisation réussie: ${result.message}`, 'success');
        
        // Mettre à jour la liste des API externes pour afficher la nouvelle date de synchronisation
        loadExternalApis();
      } else {
        showNotification(`Échec de la synchronisation: ${result.message}`, 'danger');
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation avec l\'API:', error);
      showNotification('Erreur lors de la synchronisation avec l\'API externe', 'danger');
    } finally {
      setLoadingSection(null);
    }
  };
  
  // Gérer la suppression d'une API externe
  const handleDeleteApi = async (apiId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette API externe ?')) {
      return;
    }
    
    try {
      setLoadingSection(`api-delete-${apiId}`);
      
      const result = await integrationService.deleteApi(apiId);
      
      if (result.success) {
        showNotification('API externe supprimée avec succès', 'success');
        
        // Mettre à jour la liste des API externes
        loadExternalApis();
      } else {
        showNotification(`Erreur lors de la suppression: ${result.message}`, 'danger');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'API:', error);
      showNotification('Erreur lors de la suppression de l\'API externe', 'danger');
    } finally {
      setLoadingSection(null);
    }
  };

  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className={styles.integrationContainer}>
      <h2 className={styles.pageTitle}>
        <FaExchangeAlt className={styles.titleIcon} />
        Interopérabilité et Intégration
      </h2>
      
      {notification.show && (
        <Alert 
          variant={notification.type} 
          className={styles.notification}
          onClose={() => setNotification({ show: false, message: '', type: '' })}
          dismissible
        >
          {notification.message}
        </Alert>
      )}
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className={styles.tabs}
        id="integration-tabs"
      >
        <Tab eventKey="import-export" title={<span><FaFileImport /> Import/Export</span>}>
          <div className={styles.tabContent}>
            <div className="row">
              {/* Section Importation */}
              <div className="col-md-6 mb-4">
                <Card className={styles.card}>
                  <Card.Header>
                    <FaFileImport className={styles.cardIcon} /> Importation
                  </Card.Header>
                  <Card.Body>
                    <Form onSubmit={handleImport}>
                      <Form.Group className="mb-3">
                        <Form.Label>Source</Form.Label>
                        <Form.Select 
                          name="sourceType" 
                          value={importForm.sourceType}
                          onChange={handleImportFormChange}
                        >
                          <option value="file">Fichier local</option>
                          <option value="url">URL distante</option>
                        </Form.Select>
                      </Form.Group>
                      
                      {importForm.sourceType === 'file' ? (
                        <Form.Group className="mb-3">
                          <Form.Label>Fichier</Form.Label>
                          <Form.Control 
                            type="file" 
                            onChange={handleFileChange}
                            accept=".ifc,.ifcXML,.ifczip,.bcf,.xlsx,.csv,.json"
                          />
                          <Form.Text muted>
                            Formats supportés: IFC, BCF, Excel, CSV, JSON
                          </Form.Text>
                        </Form.Group>
                      ) : (
                        <Form.Group className="mb-3">
                          <Form.Label>URL</Form.Label>
                          <Form.Control 
                            type="url" 
                            name="url" 
                            value={importForm.url}
                            onChange={handleImportFormChange}
                            placeholder="https://exemple.com/modele.ifc"
                          />
                        </Form.Group>
                      )}
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Format</Form.Label>
                        <Form.Select 
                          name="format" 
                          value={importForm.format}
                          onChange={handleImportFormChange}
                        >
                          {exchangeFormats.map(format => (
                            <option key={format.id} value={format.id}>{format.name}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Options</Form.Label>
                        <div>
                          <Form.Check 
                            type="checkbox"
                            id="validate-geometry"
                            name="validateGeometry"
                            label="Valider la géométrie"
                            checked={importForm.options.validateGeometry}
                            onChange={handleImportFormChange}
                          />
                          <Form.Check 
                            type="checkbox"
                            id="import-properties"
                            name="importProperties"
                            label="Importer les propriétés"
                            checked={importForm.options.importProperties}
                            onChange={handleImportFormChange}
                          />
                        </div>
                      </Form.Group>
                      
                      <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={loading}
                        className="w-100"
                      >
                        {loading ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Importation en cours...
                          </>
                        ) : (
                          <>
                            <FaFileImport className="me-2" /> Importer
                          </>
                        )}
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </div>
              
              {/* Section Exportation */}
              <div className="col-md-6 mb-4">
                <Card className={styles.card}>
                  <Card.Header>
                    <FaFileExport className={styles.cardIcon} /> Exportation
                  </Card.Header>
                  <Card.Body>
                    <Form onSubmit={handleExport}>
                      <Form.Group className="mb-3">
                        <Form.Label>Format d'exportation</Form.Label>
                        <Form.Select 
                          name="format" 
                          value={exportForm.format}
                          onChange={handleExportFormChange}
                        >
                          {exchangeFormats.map(format => (
                            <option key={format.id} value={format.id}>{format.name}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Destination</Form.Label>
                        <Form.Select 
                          name="target" 
                          value={exportForm.target}
                          onChange={handleExportFormChange}
                        >
                          <option value="file">Fichier local</option>
                          <option value="email">Email</option>
                          <option value="cloud">Stockage cloud</option>
                        </Form.Select>
                      </Form.Group>
                      
                      {exportForm.target === 'email' && (
                        <Form.Group className="mb-3">
                          <Form.Label>Adresse email</Form.Label>
                          <Form.Control 
                            type="email" 
                            name="destination" 
                            value={exportForm.destination}
                            onChange={handleExportFormChange}
                            placeholder="exemple@domaine.com"
                          />
                        </Form.Group>
                      )}
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Options</Form.Label>
                        <div>
                          <Form.Check 
                            type="checkbox"
                            id="include-properties"
                            name="includeProperties"
                            label="Inclure les propriétés"
                            checked={exportForm.includeProperties}
                            onChange={handleExportFormChange}
                          />
                          <Form.Check 
                            type="checkbox"
                            id="include-materials"
                            name="includeMaterials"
                            label="Inclure les matériaux"
                            checked={exportForm.includeMaterials}
                            onChange={handleExportFormChange}
                          />
                        </div>
                      </Form.Group>
                      
                      <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={loading}
                        className="w-100"
                      >
                        {loading ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Exportation en cours...
                          </>
                        ) : (
                          <>
                            <FaFileExport className="me-2" /> Exporter
                          </>
                        )}
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </div>
            </div>
          </div>
        </Tab>
        
        <Tab eventKey="connectors" title={<span><FaPlug /> Connecteurs</span>}>
          <div className={styles.tabContent}>
            <Card className={styles.card}>
              <Card.Header>
                <FaPlug className={styles.cardIcon} /> Connecteurs disponibles
                {loadingSection === 'connectors' && (
                  <Spinner animation="border" size="sm" className="ms-2" />
                )}
                <Button 
                  variant="outline-secondary"
                  size="sm"
                  className="float-end"
                  onClick={() => integrationService.getConnectors().then(data => setAvailableConnectors(data))}
                  disabled={loadingSection === 'connectors'}
                >
                  <FaSync className="me-1" /> Actualiser
                </Button>
              </Card.Header>
              <Card.Body>
                {availableConnectors.length === 0 ? (
                  loadingSection === 'connectors' ? (
                    <div className="text-center p-4">
                      <Spinner animation="border" role="status">
                        <span className="visually-hidden">Chargement...</span>
                      </Spinner>
                      <p className="mt-2">Chargement des connecteurs...</p>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <p>Aucun connecteur disponible</p>
                    </div>
                  )
                ) : (
                  <div className={styles.connectorsList}>
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Connecteur</th>
                          <th>Description</th>
                          <th>Version</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableConnectors.map(connector => (
                          <tr key={connector.id}>
                            <td>
                              <div className={styles.connectorName}>
                                <span className={`${styles.connectorIcon} ${connector.status === 'active' ? styles.active : ''}`}>
                                  {connector.icon === 'database' ? <FaDatabase /> : 
                                   connector.icon === 'link' ? <FaLink /> : <FaPlug />}
                                </span>
                                <span>{connector.name}</span>
                              </div>
                            </td>
                            <td>{connector.description}</td>
                            <td>{connector.version}</td>
                            <td>
                              <Badge 
                                bg={connector.status === 'active' ? 'success' : 'secondary'}
                                className={styles.statusBadge}
                              >
                                {connector.status === 'active' ? 'Actif' : 'Inactif'}
                              </Badge>
                            </td>
                            <td>
                              {loadingSection === `connector-${connector.id}` ? (
                                <Spinner animation="border" size="sm" />
                              ) : connector.status === 'active' ? (
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  onClick={() => handleConnectorStatusChange(connector.id, 'inactive')}
                                >
                                  Désactiver
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline-success" 
                                  size="sm"
                                  onClick={() => handleConnectorStatusChange(connector.id, 'active')}
                                >
                                  Activer
                                </Button>
                              )}
                              
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                className="ms-1"
                                onClick={() => {
                                  // Configuration du connecteur (à implémenter)
                                  showNotification('Configuration non disponible pour le moment', 'info');
                                }}
                              >
                                <FaCogs className="me-1" /> Configurer
                              </Button>
                              
                              <Button 
                                variant="outline-secondary" 
                                size="sm"
                                className="ms-1"
                                onClick={() => {
                                  // Test du connecteur (à implémenter)
                                  showNotification(`Test du connecteur ${connector.name} en cours...`, 'info');
                                }}
                              >
                                <FaSync className="me-1" /> Tester
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        </Tab>
        
        <Tab eventKey="history" title={<span><FaDatabase /> Historique</span>}>
          <div className={styles.tabContent}>
            <Card className={styles.card}>
              <Card.Header>
                <FaDatabase className={styles.cardIcon} /> Historique des Opérations
                {loadingSection === 'history' && (
                  <Spinner animation="border" size="sm" className="ms-2" />
                )}
                <Button 
                  variant="outline-secondary"
                  size="sm"
                  className="float-end"
                  onClick={loadOperationHistory}
                  disabled={loadingSection === 'history'}
                >
                  <FaSync className="me-1" /> Actualiser
                </Button>
              </Card.Header>
              <Card.Body>
                {integrationHistory.length === 0 ? (
                  loadingSection === 'history' ? (
                    <div className="text-center p-4">
                      <Spinner animation="border" role="status">
                        <span className="visually-hidden">Chargement...</span>Erreur d'importation: Cannot convert undefined or null to object


                      </Spinner>
                      <p className="mt-2">Chargement de l'historique...</p>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <p>Aucune opération dans l'historique</p>
                      <Button 
                        variant="outline-primary" 
                        onClick={() => setActiveTab('import-export')}
                      >
                        <FaFileImport className="me-2" /> Importer un fichier
                      </Button>
                    </div>
                  )
                ) : (
                  <div className={styles.historyTable}>
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Type</th>
                          <th>Source/Destination</th>
                          <th>Format</th>
                          <th>Date</th>
                          <th>Utilisateur</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {integrationHistory.map(item => (
                          <tr key={item.id} className={item.status === 'failed' ? styles.errorRow : ''}>
                            <td>{item.id}</td>
                            <td>
                              {item.type === 'import' ? 
                                <span><FaFileImport className="me-1" /> Import</span> : 
                                <span><FaFileExport className="me-1" /> Export</span>
                              }
                            </td>
                            <td>{item.source || item.destination}</td>
                            <td>{item.format}</td>
                            <td>{formatDate(item.date)}</td>
                            <td>{item.user}</td>
                            <td>
                              <Badge 
                                bg={
                                  item.status === 'success' ? 'success' : 
                                  item.status === 'failed' ? 'danger' : 
                                  item.status === 'processing' ? 'warning' : 'secondary'
                                }
                                className={styles.statusBadge}
                              >
                                {item.status === 'success' ? 'Réussi' : 
                                 item.status === 'failed' ? 'Échoué' : 
                                 item.status === 'processing' ? 'En cours' : item.status}
                              </Badge>
                            </td>
                            <td>
                              <Button 
                                variant="outline-info" 
                                size="sm"
                                onClick={() => showOperationDetails(item)}
                              >
                                Détails
                              </Button>
                              
                              {item.status === 'success' && item.type === 'import' && (
                                <Button 
                                  variant="outline-success" 
                                  size="sm" 
                                  className="ms-1"
                                  onClick={() => {
                                    // Reconstruire les résultats pour afficher le modal
                                    setImportResults({
                                      fileName: item.source,
                                      fileSize: item.details?.fileSize || 'N/A',
                                      format: item.format,
                                      source: item.source || 'client',
                                      projectName: item.details?.projectName || 'Inconnu',
                                      projectDescription: item.details?.projectDescription || 'Aucune description',
                                      elements: item.details?.elements || 0,
                                      properties: item.details?.properties || 0,
                                      warningsCount: item.details?.warnings || 0,
                                      entityCounts: item.details?.entityCounts || {},
                                      stats: item.details?.stats || {},
                                      timestamp: item.date,
                                      warnings: item.details?.importWarnings || [],
                                      serverUpload: !!item.details?.serverFileId,
                                      localOnly: item.details?.localOnly || false
                                    });
                                    setShowResultsModal(true);
                                  }}
                                >
                                  Résultats
                                </Button>
                              )}
                              
                              {item.status === 'success' && item.type === 'export' && (
                                <Button 
                                  variant="outline-secondary" 
                                  size="sm" 
                                  className="ms-1"
                                  onClick={() => {
                                    // Simulation de téléchargement
                                    showNotification('Téléchargement démarré...', 'info');
                                  }}
                                >
                                  Télécharger
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        </Tab>
        
        <Tab eventKey="api" title={<span><FaCogs /> API Externes</span>}>
          <div className={styles.tabContent}>
            <Card className={styles.card}>
              <Card.Header>
                <FaCogs className={styles.cardIcon} /> APIs du projet BIM Recovery
                {loadingSection === 'apis' && (
                  <Spinner animation="border" size="sm" className="ms-2" />
                )}
                <Button 
                  variant="outline-primary"
                  size="sm"
                  className="float-end me-2"
                  onClick={() => {
                    setApiConfigForm({
                      id: '',
                      name: '',
                      url: '',
                      apiKey: '',
                      description: ''
                    });
                    setShowApiModal(true);
                  }}
                >
                  <FaPlus className="me-1" /> Ajouter
                </Button>
                <Button 
                  variant="outline-secondary"
                  size="sm"
                  className="float-end me-2"
                  onClick={loadExternalApis}
                  disabled={loadingSection === 'apis'}
                >
                  <FaSync className="me-1" /> Actualiser
                </Button>
              </Card.Header>
              <Card.Body>
                {externalApis.length === 0 ? (
                  loadingSection === 'apis' ? (
                    <div className="text-center p-4">
                      <Spinner animation="border" role="status">
                        <span className="visually-hidden">Chargement...</span>
                      </Spinner>
                      <p className="mt-2">Chargement des API externes...</p>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <p>Aucune API externe configurée</p>
                      <Button 
                        variant="primary" 
                        onClick={() => {
                          setApiConfigForm({
                            id: '',
                            name: '',
                            url: '',
                            apiKey: '',
                            description: ''
                          });
                          setShowApiModal(true);
                        }}
                      >
                        <FaPlus className="me-2" /> Ajouter une API
                      </Button>
                    </div>
                  )
                ) : (
                  <div className={styles.apiList}>
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>URL</th>
                          <th>Description</th>
                          <th>Statut</th>
                          <th>Dernière synchronisation</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {externalApis.map(api => (
                          <tr key={api.id}>
                            <td>{api.name}</td>
                            <td>
                              <a href={api.url} target="_blank" rel="noopener noreferrer">
                                {api.url}
                              </a>
                            </td>
                            <td>{api.description}</td>
                            <td>
                              {api.status === 'connected' && (
                                <Badge bg="success">Connecté</Badge>
                              )}
                              {api.status === 'configured' && (
                                <Badge bg="info">Configuré</Badge>
                              )}
                              {api.status === 'error' && (
                                <Badge bg="danger">Erreur</Badge>
                              )}
                            </td>
                            <td>{api.lastSync ? formatDate(api.lastSync) : 'Jamais'}</td>
                            <td>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                className="me-1"
                                onClick={() => {
                                  setApiConfigForm({
                                    id: api.id,
                                    name: api.name,
                                    url: api.url,
                                    apiKey: api.apiKey || '',
                                    description: api.description || ''
                                  });
                                  setShowApiModal(true);
                                }}
                              >
                                <FaCogs className="me-1" /> Configurer
                              </Button>
                              
                              <Button 
                                variant="outline-secondary" 
                                size="sm"
                                className="ms-1"
                                onClick={() => handleSyncApi(api.id)}
                                disabled={loadingSection === `api-sync-${api.id}`}
                              >
                                {loadingSection === `api-sync-${api.id}` ? (
                                  <Spinner animation="border" size="sm" />
                                ) : (
                                  <>
                                    <FaSync className="me-1" /> Synchroniser
                                  </>
                                )}
                              </Button>
                              
                              <Button 
                                variant="outline-info" 
                                size="sm"
                                className="ms-1"
                                onClick={() => window.open(api.url, '_blank')}
                              >
                                <FaExternalLinkAlt className="me-1" /> Tester
                              </Button>
                              
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                className="ms-1"
                                onClick={() => handleDeleteApi(api.id)}
                                disabled={loadingSection === `api-delete-${api.id}`}
                              >
                                {loadingSection === `api-delete-${api.id}` ? (
                                  <Spinner animation="border" size="sm" />
                                ) : (
                                  <>
                                    <FaTrash className="me-1" /> Supprimer
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
            
            {/* Modal de configuration d'API */}
            <Modal
              show={showApiModal}
              onHide={() => setShowApiModal(false)}
              centered
            >
              <Modal.Header closeButton>
                <Modal.Title>
                  {apiConfigForm.id ? 'Modifier l\'API externe' : 'Ajouter une API externe'}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Nom</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={apiConfigForm.name}
                      onChange={(e) => setApiConfigForm({...apiConfigForm, name: e.target.value})}
                      placeholder="Nom de l'API"
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>URL</Form.Label>
                    <Form.Control 
                      type="url" 
                      value={apiConfigForm.url}
                      onChange={(e) => setApiConfigForm({...apiConfigForm, url: e.target.value})}
                      placeholder="https://api.exemple.com"
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Clé API</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={apiConfigForm.apiKey}
                      onChange={(e) => setApiConfigForm({...apiConfigForm, apiKey: e.target.value})}
                      placeholder="Clé d'authentification"
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={3}
                      value={apiConfigForm.description}
                      onChange={(e) => setApiConfigForm({...apiConfigForm, description: e.target.value})}
                      placeholder="Description et utilisation de cette API"
                    />
                  </Form.Group>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowApiModal(false)}>
                  Annuler
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    handleSaveApiConfig(apiConfigForm);
                    setShowApiModal(false);
                  }}
                >
                  Enregistrer
                </Button>
              </Modal.Footer>
            </Modal>
          </div>
        </Tab>
      </Tabs>

      {/* Modal des résultats d'analyse IFC */}
      <Modal
        show={showResultsModal}
        onHide={() => setShowResultsModal(false)}
        size="lg"
        centered
        className={styles.resultsModal}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaFileImport className="me-2" /> 
            Résultats d'analyse IFC
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {importResults && (
            <div className={styles.ifcResults}>
              <Alert variant={importResults.warnings && importResults.warnings.length > 0 ? "warning" : "success"}>
                <FaCloudUploadAlt size={20} className="me-2" />
                L'importation {importResults.warnings && importResults.warnings.length > 0 ? "a été réalisée avec des avertissements" : "a été réalisée avec succès"}!
                {importResults.localOnly ? (
                  <Badge bg="secondary" className="ms-2">Traitement local uniquement</Badge>
                ) : importResults.sourceType === 'client' ? (
                  <Badge bg="info" className="ms-2">Traité localement</Badge>
                ) : null}
                {importResults.serverUnavailable && (
                  <Badge bg="danger" className="ms-2">Serveur inaccessible</Badge>
                )}
              </Alert>
              
              <Card className="mb-3">
                <Card.Header>
                  <h5 className="mb-0">Informations du fichier</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered>
                    <tbody>
                      <tr>
                        <td>Nom du fichier</td>
                        <td><strong>{importResults.fileName}</strong></td>
                      </tr>
                      <tr>
                        <td>Taille</td>
                        <td>{importResults.fileSize}</td>
                      </tr>
                      <tr>
                        <td>Format</td>
                        <td>{importResults.format === 'ifc4' ? 'IFC4' : 'IFC2x3'}</td>
                      </tr>
                      <tr>
                        <td>Date d'importation</td>
                        <td>{importResults.timestamp}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
              
              <Card className="mb-3">
                <Card.Header>
                  <h5 className="mb-0">Informations du projet</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered>
                    <tbody>
                      <tr>
                        <td>Nom du projet</td>
                        <td><strong>{importResults.projectName}</strong></td>
                      </tr>
                      <tr>
                        <td>Description</td>
                        <td>{importResults.projectDescription || <em>Aucune description</em>}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
              
              {importResults.warnings && importResults.warnings.length > 0 && (
                <Alert variant="warning" className="mb-3">
                  <Alert.Heading><FaExclamationTriangle className="me-2" /> Avertissements</Alert.Heading>
                  <ul className="mb-0">
                    {importResults.warnings.map((warning, index) => (
                      <li key={index}><b>{index === 0 ? 'Important: ' : ''}</b>{warning}</li>
                    ))}
                  </ul>
                  <hr />
                  <p className="mb-0">
                    <small>Ces avertissements n'empêchent pas l'importation mais peuvent affecter la qualité des données ou les fonctionnalités disponibles.</small>
                  </p>
                </Alert>
              )}
              
              {/* Aide pour les problèmes courants d'importation IFC */}
              {importResults.warnings && importResults.warnings.length > 0 && (
                <Card className="mb-3 border-info">
                  <Card.Header className="bg-info text-white">
                    <FaInfoCircle className="me-2" /> Solutions aux problèmes courants
                  </Card.Header>
                  <Card.Body>
                    <h6>Si aucune entité n'a pu être extraite:</h6>
                    <ul>
                      <li>Vérifiez que votre fichier IFC est valide et complet</li>
                      <li>Essayez d'utiliser une version plus récente/ancienne du format (IFC2x3 vs IFC4)</li>
                      <li>Validez votre fichier avec un autre outil IFC avant l'import</li>
                    </ul>
                    
                    {importResults.localOnly && (
                      <>
                        <h6>Si le fichier est traité localement uniquement:</h6>
                        <ul>
                          <li>Vérifiez que le serveur est accessible et fonctionne correctement</li>
                          <li>La taille du fichier pourrait dépasser la limite autorisée (max: 50 Mo)</li>
                          <li>Votre session pourrait avoir expiré. Essayez de vous reconnecter</li>
                        </ul>
                      </>
                    )}
                    
                    {importResults.schemaIssue && (
                      <>
                        <h6>Si le schéma IFC n'a pas pu être chargé complètement:</h6>
                        <ul>
                          <li>Rechargez la page et essayez à nouveau</li>
                          <li>Utilisez un navigateur plus récent</li>
                          <li>Vérifiez que le fichier IFC est conforme au standard</li>
                        </ul>
                      </>
                    )}
                  </Card.Body>
                </Card>
              )}
              
              <Card className="mb-3">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Statistiques du modèle</h5>
                  <Badge bg={importResults.elements > 0 ? "success" : "warning"}>
                    {importResults.elements > 0 ? "Données extraites" : "Aucune donnée"}
                  </Badge>
                </Card.Header>
                <Card.Body>
                  <div className="row">
                    <div className="col-md-6">
                      <div className={styles.statCard}>
                        <div className={styles.statValue}>{importResults.elements || 0}</div>
                        <div className={styles.statLabel}>Éléments totaux</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className={styles.statCard}>
                        <div className={styles.statValue}>
                          {importResults.properties || (importResults.entityCounts ? Object.keys(importResults.entityCounts).length : 0)}
                        </div>
                        <div className={styles.statLabel}>Types d'entités</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className={styles.statCard}>
                        <div className={styles.statValue}>
                          <FaBuilding className="me-1" /> {importResults.stats?.wallCount || 0}
                        </div>
                        <div className={styles.statLabel}>Murs</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className={styles.statCard}>
                        <div className={styles.statValue}>
                          <FaDoorOpen className="me-1" /> {importResults.stats?.doorCount || 0}
                        </div>
                        <div className={styles.statLabel}>Portes</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className={styles.statCard}>
                        <div className={styles.statValue}>
                          <FaWindowRestore className="me-1" /> {importResults.stats?.windowCount || 0}
                        </div>
                        <div className={styles.statLabel}>Fenêtres</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className={styles.statCard}>
                        <div className={styles.statValue}>{importResults.stats?.floorCount || 0}</div>
                        <div className={styles.statLabel}>Planchers/Dalles</div>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
              
              {importResults.entityCounts && typeof importResults.entityCounts === 'object' && Object.keys(importResults.entityCounts).length > 0 && (
                <Card className="mb-3">
                  <Card.Header>
                    <h5 className="mb-0">Détails des entités</h5>
                  </Card.Header>
                  <Card.Body>
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Type d'entité</th>
                          <th>Nombre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          try {
                            return Object.entries(importResults.entityCounts)
                              .sort(([, countA], [, countB]) => countB - countA)
                              .map(([entityType, count]) => (
                                <tr key={entityType}>
                                  <td>{entityType.replace('IFC', '')}</td>
                                  <td>{count}</td>
                                </tr>
                              ));
                          } catch (error) {
                            console.error('Erreur lors du rendu des entités:', error);
                            return <tr><td colSpan="2">Erreur lors de l'affichage des entités</td></tr>;
                          }
                        })()}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResultsModal(false)}>
            Fermer
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              setShowResultsModal(false);
              
              // Ajouter cette opération à l'historique
              if (activeTab === 'history') {
                loadOperationHistory();
              }
            }}
          >
            OK
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Modal des détails d'une opération */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {operationDetails?.type === 'import' ? (
              <><FaFileImport className="me-2" /> Détails d'importation</>
            ) : (
              <><FaFileExport className="me-2" /> Détails d'exportation</>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {operationDetails && (
            <div className={styles.operationDetails}>
              <Card className="mb-3">
                <Card.Header>
                  <h5 className="mb-0">Informations générales</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered>
                    <tbody>
                      <tr>
                        <td className={styles.detailLabel}>ID de l'opération</td>
                        <td>{operationDetails.id}</td>
                      </tr>
                      <tr>
                        <td className={styles.detailLabel}>Type</td>
                        <td>
                          {operationDetails.type === 'import' ? (
                            <span><FaFileImport className="me-2" /> Import</span>
                          ) : (
                            <span><FaFileExport className="me-2" /> Export</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className={styles.detailLabel}>Format</td>
                        <td>
                          <strong>{operationDetails.format || 'N/A'}</strong>
                          {operationDetails.format === 'ifc4' && <span className="ms-2 text-muted">IFC4</span>}
                          {operationDetails.format === 'ifc2x3' && <span className="ms-2 text-muted">IFC2x3</span>}
                        </td>
                      </tr>
                      <tr>
                        <td className={styles.detailLabel}>
                          {operationDetails.type === 'import' ? 'Source' : 'Destination'}
                        </td>
                        <td>
                          <strong>
                            {operationDetails.source || operationDetails.destination || 'N/A'}
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td className={styles.detailLabel}>Date</td>
                        <td>{formatDate(operationDetails.date)}</td>
                      </tr>
                      <tr>
                        <td className={styles.detailLabel}>Utilisateur</td>
                        <td>{operationDetails.user}</td>
                      </tr>
                      <tr>
                        <td className={styles.detailLabel}>Statut</td>
                        <td>
                          <Badge 
                            bg={
                              operationDetails.status === 'success' ? 'success' : 
                              operationDetails.status === 'failed' ? 'danger' : 
                              operationDetails.status === 'processing' ? 'warning' : 'secondary'
                            }
                          >
                            {operationDetails.status === 'success' ? 'Réussi' : 
                             operationDetails.status === 'failed' ? 'Échoué' : 
                             operationDetails.status === 'processing' ? 'En cours' : operationDetails.status}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
              
              {operationDetails.type === 'import' && operationDetails.status === 'success' && operationDetails.details && (
                <Card className="mb-3">
                  <Card.Header>
                    <h5 className="mb-0">Résultats de l'importation</h5>
                  </Card.Header>
                  <Card.Body>
                    {operationDetails.details.projectName && (
                      <p><strong>Nom du projet:</strong> {operationDetails.details.projectName}</p>
                    )}
                    
                    <div className="row mt-3">
                      {operationDetails.details.elements && (
                        <div className="col-md-4">
                          <div className={styles.statCard}>
                            <div className={styles.statValue}>{operationDetails.details.elements}</div>
                            <div className={styles.statLabel}>Éléments</div>
                          </div>
                        </div>
                      )}
                      
                      {operationDetails.details.properties && (
                        <div className="col-md-4">
                          <div className={styles.statCard}>
                            <div className={styles.statValue}>{operationDetails.details.properties}</div>
                            <div className={styles.statLabel}>Propriétés</div>
                          </div>
                        </div>
                      )}
                      
                      {operationDetails.details.warnings !== undefined && (
                        <div className="col-md-4">
                          <div className={styles.statCard}>
                            <div className={styles.statValue}>{operationDetails.details.warnings}</div>
                            <div className={styles.statLabel}>Avertissements</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {operationDetails.details.stats && (
                      <div className="mt-3">
                        <p><strong>Statistiques:</strong></p>
                        <ul className={styles.statsList}>
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
                  </Card.Body>
                </Card>
              )}
              
              {operationDetails.status === 'failed' && operationDetails.error && (
                <Alert variant="danger" className="mb-0">
                  <Alert.Heading>Erreur</Alert.Heading>
                  <p className={styles.errorMessage}>{operationDetails.error}</p>
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {operationDetails?.type === 'import' && operationDetails?.status === 'success' && (
            <Button 
              variant="success" 
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
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Modal de configuration d'API */}
      <Modal
        show={showApiModal}
        onHide={() => setShowApiModal(false)}
        size="md"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCogs className="me-2" /> 
            {apiConfigForm.id ? 'Configurer l\'API' : 'Ajouter une API externe'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nom de l'API</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={apiConfigForm.name}
                onChange={(e) => setApiConfigForm({...apiConfigForm, name: e.target.value})}
                placeholder="Nom de l'API"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>URL du service</Form.Label>
              <Form.Control
                type="text"
                name="url"
                value={apiConfigForm.url}
                onChange={(e) => setApiConfigForm({...apiConfigForm, url: e.target.value})}
                placeholder="https://api.exemple.com/v1"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Clé API</Form.Label>
              <Form.Control
                type="password"
                name="apiKey"
                value={apiConfigForm.apiKey}
                onChange={(e) => setApiConfigForm({...apiConfigForm, apiKey: e.target.value})}
                placeholder="Votre clé API"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={apiConfigForm.description}
                onChange={(e) => setApiConfigForm({...apiConfigForm, description: e.target.value})}
                placeholder="Description de cette API et son utilisation"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApiModal(false)}>
            Annuler
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              try {
                setLoading(true);
                
                // Simulation d'une sauvegarde d'API (puisque l'API réelle n'est pas disponible)
                const newApi = {
                  id: apiConfigForm.id || `api-${Date.now()}`,
                  name: apiConfigForm.name,
                  url: apiConfigForm.url,
                  status: 'configured',
                  description: apiConfigForm.description || '',
                  lastSync: null
                };
                
                // Mettre à jour la liste des API
                if (apiConfigForm.id) {
                  // Mise à jour d'une API existante
                  setExternalApis(apis => 
                    apis.map(a => a.id === apiConfigForm.id ? newApi : a)
                  );
                  
                  showNotification('Configuration de l\'API mise à jour avec succès', 'success');
                } else {
                  // Ajout d'une nouvelle API
                  setExternalApis(apis => [...apis, newApi]);
                  
                  showNotification('Nouvelle API configurée avec succès', 'success');
                }
                
                setShowApiModal(false);
              } catch (error) {
                console.error('Erreur lors de la configuration de l\'API:', error);
                showNotification(
                  `Erreur: ${error.message || 'Veuillez vérifier les informations saisies et réessayer'}`,
                  'danger'
                );
              } finally {
                setLoading(false);
              }
            }}
            disabled={!apiConfigForm.name || !apiConfigForm.url}
          >
            Enregistrer
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Notification */}
      {notification.show && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          {notification.type === 'danger' && <FaExclamationTriangle className="me-2" />}
          {notification.message}
        </div>
      )}
    </div>
  );
};

// Fonction d'aide pour formater les dates
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export default InteroperabilityPage;
