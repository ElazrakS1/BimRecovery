import React, { useState, useContext, useEffect, useCallback } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { AuthContext } from '../../context/AuthContext';
import styles from './tasks.module.css';
import { taskService } from '../../services/taskService';
import { userService } from '../../services/userService';
import { FaPlug, FaExchangeAlt, FaDownload, FaUpload, FaSyncAlt, FaCheck, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

// Helper functions for styling
const getStatusColor = (status) => {
  switch (status) {
    case 'Compatible': return styles.statusCompleted;
    case 'En cours': return styles.statusInProgress;
    case 'Partiel': return styles.statusUnderReview;
    case 'Incompatible': return styles.statusNotStarted;
    default: return '';
  }
};

const getIntegrationTypeIcon = (type) => {
  switch (type) {
    case 'Import': return <FaDownload className={styles.integrationIcon} />;
    case 'Export': return <FaUpload className={styles.integrationIcon} />;
    case 'Bidirectionnel': return <FaExchangeAlt className={styles.integrationIcon} />;
    case 'Synchronisation': return <FaSyncAlt className={styles.integrationIcon} />;
    default: return <FaPlug className={styles.integrationIcon} />;
  }
};

const InteroperabilityPage = ({ isAdminView = false }) => {
  const { isAuthenticated, userData, isAdmin, isLoading: authLoading } = useContext(AuthContext);
  const [integrations, setIntegrations] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    name: '',
    description: '',
    platform: '',
    type: 'Import',
    fileFormats: '',
    status: 'En cours'
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const statusOptions = [
    'Compatible',
    'En cours',
    'Partiel',
    'Incompatible'
  ];

  const integrationTypes = [
    'Import',
    'Export',
    'Bidirectionnel',
    'Synchronisation'
  ];
  
  const fileFormats = [
    'IFC2X3',
    'IFC4',
    'DXF',
    'DWG',
    'RVT',
    'SKP',
    'OBJ',
    'FBX',
    'PDF',
    'BCF',
    'COBie',
    'XLS'
  ];

  // Fonction pour charger les plateformes disponibles
  const loadPlatforms = useCallback(async () => {
    try {
      // Normalement on ferait un appel API - simulons des données pour l'instant
      const mockPlatforms = [
        { id: '1', name: 'Autodesk Revit', icon: 'revit' },
        { id: '2', name: 'Graphisoft ArchiCAD', icon: 'archicad' },
        { id: '3', name: 'Nemetschek Allplan', icon: 'allplan' },
        { id: '4', name: 'Bentley AECOsim', icon: 'bentley' },
        { id: '5', name: 'Tekla Structures', icon: 'tekla' },
        { id: '6', name: 'Trimble Connect', icon: 'trimble' },
        { id: '7', name: 'Solibri Model Checker', icon: 'solibri' },
        { id: '8', name: 'Autodesk Navisworks', icon: 'navisworks' }
      ];
      setPlatforms(mockPlatforms);
    } catch (err) {
      console.error('Erreur lors du chargement des plateformes:', err);
    }
  }, []);

  // Fonction pour charger les intégrations disponibles
  const loadIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      
      // Normalement on ferait un appel API - simulons des données pour l'instant
      const mockIntegrations = [
        {
          id: '1',
          name: 'Importation Revit vers BIM Recovery',
          description: 'Permet d\'importer des modèles Revit directement dans BIM Recovery',
          platformId: '1',
          platformName: 'Autodesk Revit',
          type: 'Import',
          fileFormats: ['RVT', 'IFC4'],
          status: 'Compatible',
          lastTested: '2025-06-12',
          apiVersion: '2025.1'
        },
        {
          id: '2',
          name: 'Export ArchiCAD',
          description: 'Exporte les données de BIM Recovery vers ArchiCAD',
          platformId: '2',
          platformName: 'Graphisoft ArchiCAD',
          type: 'Export',
          fileFormats: ['IFC2X3', 'BCF'],
          status: 'Partiel',
          lastTested: '2025-05-27',
          apiVersion: '26.0.0'
        },
        {
          id: '3',
          name: 'Synchronisation Trimble Connect',
          description: 'Synchronisation bidirectionnelle avec Trimble Connect',
          platformId: '6',
          platformName: 'Trimble Connect',
          type: 'Bidirectionnel',
          fileFormats: ['IFC4', 'BCF', 'PDF'],
          status: 'En cours',
          lastTested: '2025-07-01',
          apiVersion: '4.2'
        },
        {
          id: '4',
          name: 'Exportation Tekla',
          description: 'Exporte les structures vers Tekla',
          platformId: '5',
          platformName: 'Tekla Structures',
          type: 'Export',
          fileFormats: ['IFC4', 'DXF'],
          status: 'Compatible',
          lastTested: '2025-06-25',
          apiVersion: '2025'
        },
        {
          id: '5',
          name: 'Import Navisworks',
          description: 'Importe les données de coordination Navisworks',
          platformId: '8',
          platformName: 'Autodesk Navisworks',
          type: 'Import',
          fileFormats: ['NWC', 'NWD', 'IFC4'],
          status: 'Incompatible',
          lastTested: '2025-04-18',
          apiVersion: '2025.2'
        },
        {
          id: '6',
          name: 'Validation Solibri',
          description: 'Intégration avec le processus de validation Solibri',
          platformId: '7',
          platformName: 'Solibri Model Checker',
          type: 'Bidirectionnel',
          fileFormats: ['IFC4', 'SMC'],
          status: 'Compatible',
          lastTested: '2025-07-05',
          apiVersion: '9.12.0'
        }
      ];
      
      setIntegrations(mockIntegrations);
      setError(null);
    } catch (err) {
      console.error('Erreur lors du chargement des intégrations:', err);
      setError("Erreur lors du chargement des données d'intégration");
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Debug logging
  useEffect(() => {
    console.log('InteroperabilityPage - Auth State:', {
      isAuthenticated,
      isAdmin,
      userData,
      authLoading
    });
  }, [isAuthenticated, isAdmin, userData, authLoading]);
  
  // Charger les intégrations et plateformes quand l'authentification est prête
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadIntegrations();
      loadPlatforms();
    }
  }, [isAuthenticated, authLoading, loadIntegrations, loadPlatforms]);
  
  const handleCreateIntegration = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      setError('Seuls les administrateurs peuvent créer des intégrations');
      return;
    }

    // Validation des champs requis
    if (!newIntegration.name?.trim()) {
      setError('Le nom de l\'intégration est requis');
      return;
    }

    try {
      if (!newIntegration.platform) {
        setError('La plateforme est requise');
        return;
      }

      // Dans un cas réel, on enverrait cette information à l'API
      const formattedIntegration = {
        Name: newIntegration.name.trim(),
        Description: newIntegration.description?.trim() || "",
        Status: newIntegration.status || "En cours",
        Type: newIntegration.type || "Import",
        PlatformId: String(newIntegration.platform),
        FileFormats: newIntegration.fileFormats || [],
        LastTested: new Date().toISOString().split('T')[0]
      };

      console.log('Nouvelle intégration à créer:', formattedIntegration);
      // Simuler l'ajout à la liste
      const platformDetails = platforms.find(p => p.id === newIntegration.platform);
      const newIntegrationWithDetails = {
        id: `new-${Date.now()}`,
        name: newIntegration.name,
        description: newIntegration.description,
        platformId: newIntegration.platform,
        platformName: platformDetails?.name || 'Inconnu',
        type: newIntegration.type,
        fileFormats: Array.isArray(newIntegration.fileFormats) ? newIntegration.fileFormats : [newIntegration.fileFormats],
        status: newIntegration.status,
        lastTested: new Date().toISOString().split('T')[0],
        apiVersion: 'N/A'
      };
      
      setIntegrations(prevIntegrations => [...prevIntegrations, newIntegrationWithDetails]);
      setError(null);

      // Réinitialisation du formulaire
      setNewIntegration({
        name: '',
        description: '',
        platform: '',
        type: 'Import',
        fileFormats: '',
        status: 'En cours'
      });
      
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || "Erreur lors de la création de l'intégration");
    }
  };
  
  const handleStatusChange = async (integrationId, newStatus) => {
    try {
      // Dans un cas réel, on mettrait à jour via l'API
      setIntegrations(integrations.map(integration => 
        integration.id === integrationId ? { ...integration, status: newStatus } : integration
      ));
    } catch (err) {
      setError("Erreur lors de la mise à jour du statut");
    }
  };

  const handleDeleteIntegration = async (integrationId) => {
    if (!isAdmin) return;
    
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette intégration ?')) {
      try {
        // Dans un cas réel, on supprimerait via l'API
        setIntegrations(integrations.filter(integration => integration.id !== integrationId));
      } catch (err) {
        setError("Erreur lors de la suppression de l'intégration");
      }
    }
  };
  // Filtrage des intégrations basé sur les filtres actuels
  const filteredIntegrations = integrations.filter(integration => {
    const statusMatch = filterStatus === 'all' || integration.status === filterStatus;
    const platformMatch = filterPlatform === 'all' || integration.platformId === filterPlatform;
    const typeMatch = filterType === 'all' || integration.type === filterType;
      
    return statusMatch && platformMatch && typeMatch;
  });

  // Fonction pour formater la liste des formats de fichiers
  const formatFileFormats = (formats) => {
    if (!formats) return 'N/A';
    if (typeof formats === 'string') return formats;
    if (Array.isArray(formats)) return formats.join(', ');
    return 'N/A';
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.messageContainer}>
        <p>Veuillez vous connecter pour voir les intégrations.</p>
      </div>
    );
  }

  return (
    <div className={styles.tasksContainer}>
      <div className={styles.header}>
        <h1>Interopérabilité & Intégration</h1>
        <div className={styles.actions}>
          <button 
            className={styles.addButton}
            onClick={() => setIsModalOpen(true)}
          >
            {isAdmin ? 'Nouvelle Intégration' : 'Demander une Intégration'}
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">Tous les statuts</option>
          {statusOptions.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <select 
          value={filterPlatform} 
          onChange={(e) => setFilterPlatform(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">Toutes les plateformes</option>
          {platforms.map(platform => (
            <option key={platform.id} value={platform.id}>
              {platform.name}
            </option>
          ))}
        </select>
        
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">Tous les types</option>
          {integrationTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loader}></div>
        </div>
      ) : error ? (
        <div className={styles.errorContainer}>
          <p>{error}</p>
        </div>
      ) : (
        <div className={styles.tasksList}>
          {filteredIntegrations.length === 0 ? (
            <p className={styles.noTasks}>Aucune intégration trouvée</p>
          ) : (
            filteredIntegrations.map((integration) => (
              <div key={integration.id} className={`${styles.taskCard} ${getStatusColor(integration.status)}`}>
                <div className={styles.taskHeader}>
                  <h3>{integration.name}</h3>
                  {getIntegrationTypeIcon(integration.type)}
                </div>
                <p className={styles.taskDescription}>{integration.description}</p>
                <div className={styles.integrationDetails}>
                  <div className={styles.integrationMeta}>
                    <p className={styles.platform}>
                      <span>Plateforme:</span> {integration.platformName}
                    </p>
                    <p className={styles.fileFormats}>
                      <span>Formats:</span> {formatFileFormats(integration.fileFormats)}
                    </p>
                  </div>
                  <div className={styles.integrationInfo}>
                    <p className={styles.lastTested}>
                      Dernière validation: {integration.lastTested}
                    </p>
                    <p className={styles.apiVersion}>
                      Version API: {integration.apiVersion}
                    </p>
                  </div>
                </div>
                <div className={styles.taskStatus}>
                  <span>Statut:</span>
                  <select
                    value={integration.status}
                    onChange={(e) => handleStatusChange(integration.id, e.target.value)}
                    className={`${styles.statusSelect} ${getStatusColor(integration.status)}`}
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                {isAdmin && (
                  <div className={styles.adminActions}>
                    <button 
                      className={styles.deleteButton}
                      onClick={() => handleDeleteIntegration(integration.id)}
                      title="Supprimer l'intégration"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}      

      {isAdmin && (
        <>
          <button 
            className={styles.fabButton}
            onClick={() => setIsModalOpen(true)}
            title="Ajouter une nouvelle intégration"
          >
            +
          </button>

          {isModalOpen && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <h2>Nouvelle Intégration</h2>
                  <button 
                    className={styles.closeButton}
                    onClick={() => setIsModalOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={handleCreateIntegration}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Nom</label>
                      <input
                        type="text"
                        placeholder="Nom de l'intégration"
                        value={newIntegration.name}
                        onChange={(e) => setNewIntegration({ ...newIntegration, name: e.target.value })}
                        required
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Plateforme</label>
                      <select
                        className={styles.input}
                        value={newIntegration.platform}
                        onChange={(e) => setNewIntegration({ ...newIntegration, platform: e.target.value })}
                        required
                      >
                        <option value="">Sélectionner une plateforme</option>
                        {platforms.map(platform => (
                          <option key={platform.id} value={platform.id}>
                            {platform.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Type d'intégration</label>
                      <select
                        className={styles.input}
                        value={newIntegration.type}
                        onChange={(e) => setNewIntegration({ ...newIntegration, type: e.target.value })}
                      >
                        {integrationTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Statut</label>
                      <select
                        className={styles.input}
                        value={newIntegration.status}
                        onChange={(e) => setNewIntegration({ ...newIntegration, status: e.target.value })}
                      >
                        {statusOptions.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Formats de fichier supportés</label>
                    <select
                      className={styles.input}
                      value={newIntegration.fileFormats}
                      onChange={(e) => setNewIntegration({ ...newIntegration, fileFormats: e.target.value })}
                      multiple
                    >
                      {fileFormats.map(format => (
                        <option key={format} value={format}>{format}</option>
                      ))}
                    </select>
                    <small className={styles.helpText}>Maintenez Ctrl ou Cmd pour sélectionner plusieurs formats</small>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      placeholder="Description détaillée de l'intégration"
                      value={newIntegration.description}
                      onChange={(e) => setNewIntegration({ ...newIntegration, description: e.target.value })}
                      className={styles.textarea}
                      required
                    />
                  </div>
                  <div className={styles.modalActions}>
                    <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>
                      Annuler
                    </button>
                    <button type="submit" className={styles.button}>
                      Créer l'intégration
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InteroperabilityPage;
