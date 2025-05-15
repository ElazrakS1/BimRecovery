import React, { useState, useContext, useEffect, useRef } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { useLocation } from 'react-router-dom';
import './Settings.css';

const Settings = () => {
  const { texts, setLanguage, currentLanguage } = useContext(LanguageContext);
  const [activeTab, setActiveTab] = useState('general');
  const [userData, setUserData] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [isSaving, setIsSaving] = useState(false);
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
  }, []);

  // Fetch user data when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;

        const response = await fetch('https://localhost:7258/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Failed to fetch user data');
        const data = await response.json();
        setUserData(data);
        
        // Initialize user form with fetched data
        setUserForm(prev => ({
          ...prev,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || ''
        }));
      } catch (error) {
        console.error('Error fetching user data:', error);
        showNotification('Erreur lors du chargement des données utilisateur', 'error');
      }
    };

    fetchUserData();
  }, []);

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

  const handleUserFormChange = (e) => {
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
  };

  const updateUserProfile = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      setIsSaving(true);
      
      // Create request data object based on what's being edited
      const requestData = {};
      
      if (editMode.name) {
        requestData.firstName = userForm.firstName;
        requestData.lastName = userForm.lastName;
      }
      
      if (editMode.email) {
        requestData.email = userForm.email;
      }
      
      if (editMode.password) {
        // Validate passwords match
        if (userForm.newPassword !== userForm.confirmPassword) {
          showNotification('Les mots de passe ne correspondent pas', 'error');
          setIsSaving(false);
          return;
        }
        requestData.currentPassword = userForm.currentPassword;
        requestData.newPassword = userForm.newPassword;
      }
      
      // Only proceed if there's something to update
      if (Object.keys(requestData).length === 0) {
        setEditMode({ name: false, email: false, password: false });
        setIsSaving(false);
        return;
      }

      const response = await fetch('https://localhost:7258/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) throw new Error('Failed to update profile');
      
      // Update was successful, refresh user data
      const updatedUserResponse = await fetch('https://localhost:7258/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (updatedUserResponse.ok) {
        const updatedData = await updatedUserResponse.json();
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
      showNotification('Erreur lors de la mise à jour du profil', 'error');
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

  const handleFileChange = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('https://localhost:7258/api/auth/upload-avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to upload avatar');
      
      // Refresh user data to get updated avatar URL
      const updatedUserResponse = await fetch('https://localhost:7258/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (updatedUserResponse.ok) {
        const updatedData = await updatedUserResponse.json();
        setUserData(updatedData);
      }
      
      showNotification('Avatar mis à jour avec succès', 'success');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showNotification('Erreur lors du téléchargement de l\'avatar', 'error');
    }
  };

  const handleToggleEdit = (field) => {
    setEditMode(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;
      
      showNotification('Préparation de l\'export de vos données...', 'info');
      
      const response = await fetch('https://localhost:7258/api/auth/export-data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to export data');
      
      const blob = await response.blob();
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

  const handleRequestAccountDeletion = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('https://localhost:7258/api/auth/request-deletion', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to request account deletion');
      
      showNotification('Demande de suppression de compte envoyée. Vous recevrez un email de confirmation.', 'info');
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      showNotification('Erreur lors de la demande de suppression de compte', 'error');
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Function to handle browser notification permission
  const requestNotificationPermission = async () => {
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
  };

  // When browser notifications are toggled on, request permission
  useEffect(() => {
    if (formState.browserNotifications) {
      requestNotificationPermission().then(granted => {
        if (!granted) {
          setFormState(prev => ({
            ...prev,
            browserNotifications: false
          }));
          showNotification("Permission de notification refusée", "error");
        }
      });
    }
  }, [formState.browserNotifications]);

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
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </div>
                    
                    <div className="account-details">
                      <div className="account-field">
                        <label>{texts.fullName || 'Nom complet'}</label>
                        {editMode.name ? (
                          <div className="edit-field">
                            <input 
                              type="text" 
                              name="firstName" 
                              value={userForm.firstName} 
                              onChange={handleUserFormChange}
                              placeholder="Prénom"
                            />
                            <input 
                              type="text" 
                              name="lastName" 
                              value={userForm.lastName} 
                              onChange={handleUserFormChange}
                              placeholder="Nom"
                            />
                            <div className="edit-actions">
                              <button type="button" onClick={() => handleToggleEdit('name')}>
                                <i className="fas fa-times"></i>
                              </button>
                              <button type="button" onClick={updateUserProfile}>
                                <i className="fas fa-check"></i>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="field-value name-field">
                            {userData.firstName} {userData.lastName}
                            <button type="button" className="edit-btn" onClick={() => handleToggleEdit('name')}>
                              <i className="fas fa-pen"></i>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="account-field">
                        <label>{texts.email || 'Email'}</label>
                        {editMode.email ? (
                          <div className="edit-field">
                            <input 
                              type="email" 
                              name="email" 
                              value={userForm.email} 
                              onChange={handleUserFormChange}
                              placeholder="Email"
                            />
                            <div className="edit-actions">
                              <button type="button" onClick={() => handleToggleEdit('email')}>
                                <i className="fas fa-times"></i>
                              </button>
                              <button type="button" onClick={updateUserProfile}>
                                <i className="fas fa-check"></i>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="field-value">
                            {userData.email}
                            <button type="button" className="edit-btn" onClick={() => handleToggleEdit('email')}>
                              <i className="fas fa-pen"></i>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="account-field">
                        <label>{texts.password || 'Mot de passe'}</label>
                        {editMode.password ? (
                          <div className="edit-field password-edit">
                            <input 
                              type="password" 
                              name="currentPassword" 
                              value={userForm.currentPassword} 
                              onChange={handleUserFormChange}
                              placeholder="Mot de passe actuel"
                              className="password-input"
                              required
                            />
                            <input 
                              type="password" 
                              name="newPassword" 
                              value={userForm.newPassword} 
                              onChange={handleUserFormChange}
                              placeholder="Nouveau mot de passe"
                              className="password-input"
                              required
                            />
                            <input 
                              type="password" 
                              name="confirmPassword" 
                              value={userForm.confirmPassword} 
                              onChange={handleUserFormChange}
                              placeholder="Confirmer mot de passe"
                              className="password-input"
                              required
                            />
                            <div className="edit-actions">
                              <button type="button" onClick={() => handleToggleEdit('password')}>
                                <i className="fas fa-times"></i>
                              </button>
                              <button type="button" onClick={updateUserProfile}>
                                <i className="fas fa-check"></i>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="field-value">
                            ••••••••
                            <button type="button" className="edit-btn" onClick={() => handleToggleEdit('password')}>
                              <i className="fas fa-pen"></i>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="account-field">
                        <label>{texts.role || 'Rôle'}</label>
                        <div className="field-value">
                          {userData.roles?.[0] || 'Utilisateur'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="danger-zone">
                  <h3>{texts.dangerZone || 'Zone dangereuse'}</h3>
                  <button type="button" className="danger-button" onClick={handleRequestAccountDeletion}>
                    <i className="fas fa-trash-alt"></i>
                    {texts.deleteAccount || 'Supprimer le compte'}
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="settings-panel">
                <h2>{texts.notificationSettings || 'Paramètres de notification'}</h2>
                
                <div className="settings-section">
                  <label htmlFor="emailNotifications">
                    <i className="fas fa-envelope"></i>
                    {texts.emailNotifications || 'Notifications par email'}
                  </label>
                  <div className="toggle-switch">
                    <input 
                      type="checkbox" 
                      id="emailNotifications" 
                      name="emailNotifications"
                      checked={formState.emailNotifications}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="emailNotifications"></label>
                  </div>
                </div>
                
                <div className="settings-section">
                  <label htmlFor="browserNotifications">
                    <i className="fas fa-desktop"></i>
                    {texts.browserNotifications || 'Notifications navigateur'}
                  </label>
                  <div className="toggle-switch">
                    <input 
                      type="checkbox" 
                      id="browserNotifications" 
                      name="browserNotifications"
                      checked={formState.browserNotifications}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="browserNotifications"></label>
                  </div>
                </div>
                
                <div className="notification-types">
                  <h3>{texts.notifyMeAbout || 'Me notifier pour'}</h3>
                  
                  <div className="checkbox-group">
                    <div className="checkbox-item">
                      <input 
                        type="checkbox" 
                        id="notifyProjects"
                        name="notifyProjects"
                        checked={formState.notifyProjects}
                        onChange={handleInputChange}
                      />
                      <label htmlFor="notifyProjects">{texts.projectUpdates || 'Mises à jour de projets'}</label>
                    </div>
                    <div className="checkbox-item">
                      <input 
                        type="checkbox" 
                        id="notifyComments"
                        name="notifyComments"
                        checked={formState.notifyComments}
                        onChange={handleInputChange}
                      />
                      <label htmlFor="notifyComments">{texts.newComments || 'Nouveaux commentaires'}</label>
                    </div>
                    <div className="checkbox-item">
                      <input 
                        type="checkbox" 
                        id="notifyTasks"
                        name="notifyTasks"
                        checked={formState.notifyTasks}
                        onChange={handleInputChange}
                      />
                      <label htmlFor="notifyTasks">{texts.taskAssignments || 'Assignation de tâches'}</label>
                    </div>
                    <div className="checkbox-item">
                      <input 
                        type="checkbox" 
                        id="notifyMentions"
                        name="notifyMentions"
                        checked={formState.notifyMentions}
                        onChange={handleInputChange}
                      />
                      <label htmlFor="notifyMentions">{texts.mentions || 'Mentions'}</label>
                    </div>
                    <div className="checkbox-item">
                      <input 
                        type="checkbox" 
                        id="notifyDocuments" 
                        name="notifyDocuments"
                        checked={formState.notifyDocuments}
                        onChange={handleInputChange}
                      />
                      <label htmlFor="notifyDocuments">{texts.documentUpdates || 'Mise à jour de documents'}</label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
              <div className="settings-panel">
                <h2>{texts.appearanceSettings || 'Paramètres d\'apparence'}</h2>
                
                <div className="settings-section">
                  <label htmlFor="theme">
                    <i className="fas fa-moon"></i>
                    {texts.theme || 'Thème'}
                  </label>
                  <select 
                    id="theme" 
                    name="theme" 
                    value={formState.theme}
                    onChange={handleInputChange}
                  >
                    <option value="light">{texts.lightTheme || 'Thème clair'}</option>
                    <option value="dark">{texts.darkTheme || 'Thème sombre'}</option>
                    <option value="system">{texts.systemTheme || 'Thème du système'}</option>
                  </select>
                </div>

                <div className="theme-previews">
                  <div 
                    className={`theme-preview ${formState.theme === 'light' ? 'selected' : ''}`} 
                    onClick={() => handleInputChange({ target: { name: 'theme', value: 'light' } })}
                  >
                    <div className="preview-light">
                      <div className="preview-header"></div>
                      <div className="preview-sidebar"></div>
                      <div className="preview-content"></div>
                    </div>
                    <span>{texts.lightTheme || 'Thème clair'}</span>
                  </div>
                  <div 
                    className={`theme-preview ${formState.theme === 'dark' ? 'selected' : ''}`} 
                    onClick={() => handleInputChange({ target: { name: 'theme', value: 'dark' } })}
                  >
                    <div className="preview-dark">
                      <div className="preview-header"></div>
                      <div className="preview-sidebar"></div>
                      <div className="preview-content"></div>
                    </div>
                    <span>{texts.darkTheme || 'Thème sombre'}</span>
                  </div>
                  <div 
                    className={`theme-preview ${formState.theme === 'system' ? 'selected' : ''}`} 
                    onClick={() => handleInputChange({ target: { name: 'theme', value: 'system' } })}
                  >
                    <div className="preview-system">
                      <div className="preview-header"></div>
                      <div className="preview-sidebar"></div>
                      <div className="preview-content"></div>
                    </div>
                    <span>{texts.systemTheme || 'Thème du système'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Accessibility Settings */}
            {activeTab === 'accessibility' && (
              <div className="settings-panel">
                <h2>{texts.accessibilitySettings || 'Paramètres d\'accessibilité'}</h2>
                
                <div className="settings-section">
                  <label htmlFor="highContrast">
                    <i className="fas fa-adjust"></i>
                    {texts.highContrast || 'Contraste élevé'}
                  </label>
                  <div className="toggle-switch">
                    <input 
                      type="checkbox" 
                      id="highContrast" 
                      name="accessibility.highContrast"
                      checked={formState.accessibility.highContrast}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="highContrast"></label>
                  </div>
                </div>
                
                <div className="settings-section">
                  <label htmlFor="largeText">
                    <i className="fas fa-text-height"></i>
                    {texts.largeText || 'Texte plus grand'}
                  </label>
                  <div className="toggle-switch">
                    <input 
                      type="checkbox" 
                      id="largeText" 
                      name="accessibility.largeText"
                      checked={formState.accessibility.largeText}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="largeText"></label>
                  </div>
                </div>
                
                <div className="settings-section">
                  <label htmlFor="reducedMotion">
                    <i className="fas fa-running"></i>
                    {texts.reducedMotion || 'Animations réduites'}
                  </label>
                  <div className="toggle-switch">
                    <input 
                      type="checkbox" 
                      id="reducedMotion" 
                      name="accessibility.reducedMotion"
                      checked={formState.accessibility.reducedMotion}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="reducedMotion"></label>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Settings */}
            {activeTab === 'privacy' && (
              <div className="settings-panel">
                <h2>{texts.privacySettings || 'Paramètres de confidentialité'}</h2>
                
                <div className="settings-section">
                  <div className="data-retention">
                    <h3>{texts.dataRetention || 'Conservation des données'}</h3>
                    <p>{texts.dataRetentionDesc || 'Nous conservons vos données aussi longtemps que votre compte est actif.'}</p>
                    
                    <button 
                      type="button" 
                      className="secondary-button"
                      onClick={handleExportData}
                    >
                      <i className="fas fa-download"></i>
                      {texts.exportData || 'Exporter mes données'}
                    </button>
                  </div>
                </div>
                
                <div className="data-usage">
                  <h3>{texts.dataUsage || 'Utilisation des données'}</h3>
                  
                  <div className="checkbox-group">
                    <div className="checkbox-item">
                      <input 
                        type="checkbox" 
                        id="allowAnalytics"
                        name="allowAnalytics"
                        checked={formState.allowAnalytics}
                        onChange={handleInputChange}
                      />
                      <label htmlFor="allowAnalytics">{texts.allowAnalytics || 'Autoriser les analyses d\'utilisation anonymes'}</label>
                    </div>
                    <div className="checkbox-item">
                      <input 
                        type="checkbox" 
                        id="allowErrorReports"
                        name="allowErrorReports"
                        checked={formState.allowErrorReports}
                        onChange={handleInputChange}
                      />
                      <label htmlFor="allowErrorReports">{texts.allowErrorReports || 'Autoriser les rapports d\'erreur'}</label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="settings-actions">
              <button type="submit" className="primary-button" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    {texts.saving || 'Enregistrement...'}
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    {texts.saveChanges || 'Sauvegarder les modifications'}
                  </>
                )}
              </button>
              <button 
                type="button" 
                className="secondary-button"
                onClick={() => window.location.reload()}
              >
                {texts.cancel || 'Annuler'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;