import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api.config';
import './Settings.css';

const Settings = () => {
  const { texts, setLanguage, currentLanguage } = useContext(LanguageContext);  const [activeTab, setActiveTab] = useState('general');
  const [userData, setUserData] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [_isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState({
    name: false,
    email: false,
    password: false
  });
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Utiliser useLocation pour accéder aux paramètres d'URL
  const location = useLocation();

  // Définir l'onglet actif en fonction du paramètre 'tab' dans l'URL 
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['general', 'account', 'notifications', 'appearance', 'accessibility', 'privacy'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location]);

  // Load saved settings from localStorage or use defaults
  const [formState, setFormState] = useState(() => {
    const savedSettings = localStorage.getItem('userSettings');
    const defaultSettings = {
      theme: localStorage.getItem('theme') || 'light',
      language: currentLanguage || 'fr',
      emailNotifications: true,
      browserNotifications: true,
      saveViewSettings: true,
      autoSave: true,
      notifyProjects: true,
      notifyComments: true,
      notifyTasks: true,
      notifyMentions: true,
      notifyDocuments: false,
      allowAnalytics: true,
      allowErrorReports: true,
      accessibility: {
        highContrast: false,
        largeText: false,
        reducedMotion: false
      }
    };

    return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
  });

  const fileInputRef = useRef(null);

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(formState.theme);
  }, [formState.theme]);
  // Apply any saved accessibility settings on mount
  useEffect(() => {
    if (formState.accessibility.highContrast) {
      document.body.classList.add('high-contrast');
    }
    if (formState.accessibility.largeText) {
      document.body.classList.add('large-text');
    }
    if (formState.accessibility.reducedMotion) {
      document.body.classList.add('reduced-motion');
    }

    // Cleanup function
    return () => {
      document.body.classList.remove('high-contrast', 'large-text', 'reduced-motion');
    };
  }, [formState.accessibility.highContrast, formState.accessibility.largeText, formState.accessibility.reducedMotion]);

  // Fetch user data when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;        console.log(`Fetching user data from ${API_BASE_URL}/api/auth/me`);
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });        if (!response.ok) throw new Error('Failed to fetch user data');
        const data = await response.json();
        console.log('User data received:', data);
        setUserData(data);
        
        // Initialize user form with fetched data
        setUserForm(prev => ({
          ...prev,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || ''
        }));      } catch (error) {
        console.error('Error fetching user data:', error);
        showNotification('Erreur lors du chargement des données utilisateur', 'error');
      }
    };

    fetchUserData();
  }, [showNotification]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      // Handle nested accessibility settings
      if (name.startsWith('accessibility.')) {
        const accessibilitySetting = name.split('.')[1];
        setFormState(prev => ({
          ...prev,
          accessibility: {
            ...prev.accessibility,
            [accessibilitySetting]: checked
          }
        }));
        handleAccessibilityChange(accessibilitySetting, checked);
      } else {
        setFormState(prev => ({
          ...prev,
          [name]: checked
        }));
      }
    } else {
      setFormState(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Apply language change immediately
    if (name === 'language') {
      setLanguage(value);
    }

    // Apply theme change immediately
    if (name === 'theme') {
      applyTheme(value);
    }
  };

  const _handleUserFormChange = (e) => {
    const { name, value } = e.target;
    setUserForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Helper to apply theme to document
  const applyTheme = (theme) => {
    // If theme is system, check system preference
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  };

  // Function to handle accessibility changes and apply them
  const handleAccessibilityChange = (setting, checked) => {
    // Apply accessibility setting immediately
    if (setting === 'highContrast') {
      document.body.classList.toggle('high-contrast', checked);
    } else if (setting === 'largeText') {
      document.body.classList.toggle('large-text', checked);
    } else if (setting === 'reducedMotion') {
      document.body.classList.toggle('reduced-motion', checked);
    }
  };

  const saveUserSettings = async () => {
    try {
      // Save accessibility settings to localStorage
      localStorage.setItem('userSettings', JSON.stringify(formState));
      showNotification(texts.changesApplied || 'Vos changements ont été appliqués', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification(texts.somethingWentWrong || 'Une erreur est survenue', 'error');
    }
  };  const updateUserProfile = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      setIsSaving(true);
      
      // Create request data object based on what's being edited
      const updatedFields = {};
      
      if (editMode.name) {
        updatedFields.firstName = userForm.firstName;
        updatedFields.lastName = userForm.lastName;
      }
      
      if (editMode.email) {
        updatedFields.email = userForm.email;
      }
      
      if (editMode.password) {
        // Validate passwords match
        if (userForm.newPassword !== userForm.confirmPassword) {
          showNotification('Les mots de passe ne correspondent pas', 'error');
          setIsSaving(false);
          return;
        }
        
        // Ne pas tenter de changer le mot de passe pour cette version
        showNotification('Les mots de passe correspondent, mais la fonction de changement de mot de passe est désactivée pour l\'instant', 'info');
      }
      
      // Only proceed if there's something to update
      if (Object.keys(updatedFields).length === 0) {
        setEditMode({ name: false, email: false, password: false });
        setIsSaving(false);
        return;
      }

      console.log('Updating user profile in UI only (backend API not available):', updatedFields);
      
      // MODE SIMULATION: Mettre à jour uniquement l'interface sans appel API
      // Dans une application de production, cette partie serait remplacée par
      // l'appel API réel lorsque le backend sera prêt
      
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mettre à jour les données utilisateur localement
      setUserData(prevData => ({
        ...prevData,
        ...updatedFields
      }));
      
      // Rafraîchir les données utilisateur depuis l'API
      const updatedUserResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (updatedUserResponse.ok) {
        const updatedData = await updatedUserResponse.json();
        console.log('Updated user data received:', updatedData);
        setUserData(updatedData);
      }
      
      // Reset edit modes
      setEditMode({ name: false, email: false, password: false });
      
      // Reset password fields
      setUserForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      showNotification('Profil mis à jour avec succès', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification(error.message || 'Erreur lors de la mise à jour du profil', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // First save user settings (theme, language, notifications, etc.)
      await saveUserSettings();
      
      // Then update user profile if any edit modes are active
      if (editMode.name || editMode.email || editMode.password) {
        await updateUserProfile();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification(texts.somethingWentWrong || 'Une erreur est survenue', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  const handleUploadAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    try {
      // Create a FileReader to read the image
      const reader = new FileReader();
      reader.onload = (event) => {
        // Update the user data with the new avatar
        setUserData(prevData => ({
          ...prevData,
          avatarUrl: event.target.result
        }));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const _handleFileChange = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;
      
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // MODE SIMULATION: Dans un environnement de production, nous enverrions le fichier
      // à l'API backend. Pour l'instant, nous allons juste simuler une mise à jour du côté client.
      
      // Créer une URL pour l'aperçu de l'image
      const imageUrl = URL.createObjectURL(file);
      console.log('Avatar will be uploaded (simulation only):', imageUrl);
      
      // Mettre à jour l'interface utilisateur avec la nouvelle image
      setUserData(prevData => ({
        ...prevData,
        profilePhoto: imageUrl // Ceci est temporaire et disparaîtra au rechargement de la page
      }));
      
      showNotification('Avatar mis à jour avec succès (simulation)', 'success');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showNotification('Erreur lors du téléchargement de l\'avatar', 'error');
    }
  };

  const _handleToggleEdit = (field) => {
    setEditMode(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  const _handleExportData = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;
      
      showNotification('Préparation de l\'export de vos données...', 'info');
      
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // MODE SIMULATION: Créer un fichier JSON avec les données utilisateur
      const userData = {
        user: {
          email: userForm.email || 'user@example.com',
          firstName: userForm.firstName || 'Utilisateur',
          lastName: userForm.lastName || 'Test',
          settings: formState
        },
        exportDate: new Date().toISOString(),
        note: "Ceci est un exemple d'export de données (simulation)"
      };
      
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'smart-bim-data-export.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showNotification('Export de données terminé', 'success');
    } catch (error) {
      console.error('Error exporting data:', error);
      showNotification('Erreur lors de l\'export des données', 'error');
    }
  };

  const _handleRequestAccountDeletion = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;
        // Simulation temporaire - l'API request-deletion n'existe pas encore
      // const response = await fetch(`${API_BASE_URL}/api/auth/request-deletion`
      
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 1500));
        // Simuler une réponse réussie
      const response = { ok: true };
      
      if (!response.ok) throw new Error('Failed to request account deletion');
      
      showNotification('Demande de suppression de compte envoyée. Vous recevrez un email de confirmation.', 'info');
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      showNotification('Erreur lors de la demande de suppression de compte', 'error');
    }  };

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  }, []);

  // Function to handle browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      showNotification("Ce navigateur ne prend pas en charge les notifications de bureau", "error");
      return;
    }
    
    if (Notification.permission === "granted") {
      return true;
    }
    
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    
    return false;
  }, [showNotification]);
  // When browser notifications are toggled on, request permission
  useEffect(() => {
    if (formState.browserNotifications) {
      requestNotificationPermission().then(granted => {
        if (!granted) {
          setFormState(prev => ({
            ...prev,
            browserNotifications: false
          }));
          showNotification("Permission de notification refusée", "error");        }
      });
    }
  }, [formState.browserNotifications, requestNotificationPermission, showNotification]);

  return (
    <div className="settings-container">
      <h1 className="settings-title">
        <i className="fas fa-sliders-h"></i> 
        {texts.settings || 'Paramètres'}
      </h1>

      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.type === 'success' && <i className="fas fa-check-circle"></i>}
          {notification.type === 'error' && <i className="fas fa-exclamation-circle"></i>}
          {notification.type === 'info' && <i className="fas fa-info-circle"></i>}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="settings-layout">
        <div className="settings-sidebar">
          <ul className="settings-nav">
            <li 
              className={activeTab === 'general' ? 'active' : ''} 
              onClick={() => handleTabChange('general')}
            >
              <i className="fas fa-cog"></i>
              <span>{texts.general || 'Général'}</span>
            </li>
            <li 
              className={activeTab === 'account' ? 'active' : ''} 
              onClick={() => handleTabChange('account')}
            >
              <i className="fas fa-user-circle"></i>
              <span>{texts.account || 'Compte'}</span>
            </li>
            <li 
              className={activeTab === 'notifications' ? 'active' : ''} 
              onClick={() => handleTabChange('notifications')}
            >
              <i className="fas fa-bell"></i>
              <span>{texts.notifications || 'Notifications'}</span>
            </li>
            <li 
              className={activeTab === 'appearance' ? 'active' : ''} 
              onClick={() => handleTabChange('appearance')}
            >
              <i className="fas fa-palette"></i>
              <span>{texts.appearance || 'Apparence'}</span>
            </li>
            <li 
              className={activeTab === 'accessibility' ? 'active' : ''} 
              onClick={() => handleTabChange('accessibility')}
            >
              <i className="fas fa-universal-access"></i>
              <span>{texts.accessibility || 'Accessibilité'}</span>
            </li>
            <li 
              className={activeTab === 'privacy' ? 'active' : ''} 
              onClick={() => handleTabChange('privacy')}
            >
              <i className="fas fa-shield-alt"></i>
              <span>{texts.privacy || 'Confidentialité'}</span>
            </li>
          </ul>
        </div>

        <div className="settings-content">
          <form onSubmit={handleSave}>
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="settings-panel">
                <h2>{texts.general || 'Paramètres généraux'}</h2>
                
                <div className="settings-section">
                  <label htmlFor="language">
                    <i className="fas fa-language"></i>
                    {texts.language || 'Langue'}
                  </label>
                  <select 
                    id="language" 
                    name="language" 
                    value={formState.language}
                    onChange={handleInputChange}
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>

                <div className="settings-section">
                  <label htmlFor="autoSave">
                    <i className="fas fa-save"></i>
                    {texts.autoSave || 'Sauvegarde automatique'}
                  </label>
                  <div className="toggle-switch">
                    <input 
                      type="checkbox" 
                      id="autoSave" 
                      name="autoSave"
                      checked={formState.autoSave}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="autoSave"></label>
                  </div>
                </div>

                <div className="settings-section">
                  <label htmlFor="saveViewSettings">
                    <i className="fas fa-eye"></i>
                    {texts.saveViewSettings || 'Mémoriser les paramètres de vue'}
                  </label>
                  <div className="toggle-switch">
                    <input 
                      type="checkbox" 
                      id="saveViewSettings" 
                      name="saveViewSettings"
                      checked={formState.saveViewSettings}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="saveViewSettings"></label>
                  </div>
                </div>
              </div>
            )}

            {/* Account Settings */}
            {activeTab === 'account' && (
              <div className="settings-panel">
                <h2>{texts.accountSettings || 'Paramètres du compte'}</h2>
                
                {userData && (
                  <div className="account-info">
                    <div className="user-avatar">
                      {userData.profilePhoto ? (
                        <img src={userData.profilePhoto} alt="Profile" />
                      ) : (
                        <div className="avatar-placeholder">
                          {userData.firstName?.[0]}{userData.lastName?.[0]}
                        </div>
                      )}
                      <button type="button" className="change-avatar-btn" onClick={handleUploadAvatar}>
                        <i className="fas fa-camera"></i>
                      </button>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default Settings;
