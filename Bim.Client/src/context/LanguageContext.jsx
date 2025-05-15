import React, { createContext, useState, useEffect } from 'react';

export const LanguageContext = createContext();

const translations = {
  fr: {
    search: 'Rechercher...',
    notifications: 'Notifications',
    markAllRead: 'Tout marquer comme lu',
    noNotifications: 'Aucune notification',
    viewAllNotifications: 'Voir toutes les notifications',
    profile: 'Profil',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    searching: 'Recherche en cours...',
    searchResults: 'Résultats',
    project: 'Projet',
    model: 'Modèle',
    seeAllResults: 'Voir tous les résultats',
    noSearchResults: 'Aucun résultat trouvé',
    // Settings translations
    general: 'Général',
    account: 'Compte',
    appearance: 'Apparence',
    accessibility: 'Accessibilité',
    privacy: 'Confidentialité',
    language: 'Langue',
    saveViewSettings: 'Mémoriser les paramètres de vue',
    autoSave: 'Sauvegarde automatique',
    accountSettings: 'Paramètres du compte',
    fullName: 'Nom complet',
    email: 'Email',
    password: 'Mot de passe',
    role: 'Rôle',
    dangerZone: 'Zone dangereuse',
    deleteAccount: 'Supprimer le compte',
    notificationSettings: 'Paramètres de notification',
    emailNotifications: 'Notifications par email',
    browserNotifications: 'Notifications navigateur',
    notifyMeAbout: 'Me notifier pour',
    projectUpdates: 'Mises à jour de projets',
    newComments: 'Nouveaux commentaires',
    taskAssignments: 'Assignation de tâches',
    mentions: 'Mentions',
    documentUpdates: 'Mise à jour de documents',
    appearanceSettings: 'Paramètres d\'apparence',
    theme: 'Thème',
    lightTheme: 'Thème clair',
    darkTheme: 'Thème sombre',
    systemTheme: 'Thème du système',
    accessibilitySettings: 'Paramètres d\'accessibilité',
    highContrast: 'Contraste élevé',
    largeText: 'Texte plus grand',
    reducedMotion: 'Animations réduites',
    privacySettings: 'Paramètres de confidentialité',
    dataRetention: 'Conservation des données',
    dataRetentionDesc: 'Nous conservons vos données aussi longtemps que votre compte est actif.',
    exportData: 'Exporter mes données',
    dataUsage: 'Utilisation des données',
    allowAnalytics: 'Autoriser les analyses d\'utilisation anonymes',
    allowErrorReports: 'Autoriser les rapports d\'erreur',
    saveChanges: 'Sauvegarder les modifications',
    cancel: 'Annuler',
    changesApplied: 'Vos changements ont été appliqués',
    somethingWentWrong: 'Une erreur est survenue'
  },
  en: {
    search: 'Search...',
    notifications: 'Notifications',
    markAllRead: 'Mark all as read',
    noNotifications: 'No notifications',
    viewAllNotifications: 'View all notifications',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Log out',
    searching: 'Searching...',
    searchResults: 'Results',
    project: 'Project',
    model: 'Model',
    seeAllResults: 'See all results',
    noSearchResults: 'No results found',
    // Settings translations
    general: 'General',
    account: 'Account',
    appearance: 'Appearance',
    accessibility: 'Accessibility',
    privacy: 'Privacy',
    language: 'Language',
    saveViewSettings: 'Remember view settings',
    autoSave: 'Auto save',
    accountSettings: 'Account settings',
    fullName: 'Full name',
    email: 'Email',
    password: 'Password',
    role: 'Role',
    dangerZone: 'Danger zone',
    deleteAccount: 'Delete account',
    notificationSettings: 'Notification settings',
    emailNotifications: 'Email notifications',
    browserNotifications: 'Browser notifications',
    notifyMeAbout: 'Notify me about',
    projectUpdates: 'Project updates',
    newComments: 'New comments',
    taskAssignments: 'Task assignments',
    mentions: 'Mentions',
    documentUpdates: 'Document updates',
    appearanceSettings: 'Appearance settings',
    theme: 'Theme',
    lightTheme: 'Light theme',
    darkTheme: 'Dark theme',
    systemTheme: 'System theme',
    accessibilitySettings: 'Accessibility settings',
    highContrast: 'High contrast',
    largeText: 'Large text',
    reducedMotion: 'Reduced motion',
    privacySettings: 'Privacy settings',
    dataRetention: 'Data retention',
    dataRetentionDesc: 'We retain your data as long as your account is active.',
    exportData: 'Export my data',
    dataUsage: 'Data usage',
    allowAnalytics: 'Allow anonymous usage analytics',
    allowErrorReports: 'Allow error reports',
    saveChanges: 'Save changes',
    cancel: 'Cancel',
    changesApplied: 'Your changes have been applied',
    somethingWentWrong: 'Something went wrong'
  },
  es: {
    search: 'Buscar...',
    notifications: 'Notificaciones',
    markAllRead: 'Marcar todo como leído',
    noNotifications: 'Sin notificaciones',
    viewAllNotifications: 'Ver todas las notificaciones',
    profile: 'Perfil',
    settings: 'Configuración',
    logout: 'Cerrar sesión',
    // Add other Spanish translations as needed
  },
  de: {
    search: 'Suchen...',
    notifications: 'Benachrichtigungen',
    markAllRead: 'Alle als gelesen markieren',
    noNotifications: 'Keine Benachrichtigungen',
    viewAllNotifications: 'Alle Benachrichtigungen anzeigen',
    profile: 'Profil',
    settings: 'Einstellungen',
    logout: 'Abmelden',
    // Add other German translations as needed
  }
};

export const LanguageProvider = ({ children }) => {
  // Initialize language from localStorage or default to 'fr'
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('preferredLanguage') || 'fr';
  });
  
  // Apply language change to localStorage
  useEffect(() => {
    localStorage.setItem('preferredLanguage', language);
    
    // Update document language attribute for accessibility
    document.documentElement.setAttribute('lang', language);
  }, [language]);
  
  const changeLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
    }
  };
  
  const value = {
    texts: translations[language] || translations.fr, // Fallback to French if language not found
    currentLanguage: language,
    setLanguage: changeLanguage
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
