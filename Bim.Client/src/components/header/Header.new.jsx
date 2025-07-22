import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LanguageContext } from '../../context/LanguageContext';
import { AuthContext } from '../../context/AuthContext';
import NotificationsMenu from '../notifications/NotificationsMenu';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaBars, FaSearch, FaUser, FaCog, FaSignOutAlt, 
  FaSpinner, FaSearchMinus, FaFile, FaRocket,
  FaMoon, FaSun, FaBell, FaChevronDown, FaChevronUp,
  FaProjectDiagram, FaCubes, FaTachometerAlt, FaHome
} from 'react-icons/fa';
import './Header-modern.css'; // Nouveau style moderne et bien structuré
import '../notifications/NotificationsMenu-modern.css'; // Styles pour le menu de notifications

// Définition du composant Header
const Header = ({ title, userData, pageTitle, onToggleSidebar }) => {
  const { texts } = useContext(LanguageContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // State pour stocker la position du dropdown
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const userButtonRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchResultsRef = useRef(null);
  
  // Référence pour le conteneur de notification
  const notificationRef = useRef(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2); // Valeur initiale pour la démo
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  
  // Navigation rapide
  const [quickNavOpen, setQuickNavOpen] = useState(false);
  const quickNavRef = useRef(null);

  // Fonction pour gérer le scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Gestionnaire pour le changement de thème
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.body.classList.toggle('dark-mode', newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
  };

  // Charge le thème depuis localStorage au montage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    document.body.classList.toggle('dark-mode', savedDarkMode);
  }, []);

  // Fermeture des dropdowns en cliquant ailleurs
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          userButtonRef.current && !userButtonRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      
      if (notificationOpen && notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
      
      if (showSearchResults && searchResultsRef.current && !searchResultsRef.current.contains(event.target) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
      
      if (quickNavOpen && quickNavRef.current && !quickNavRef.current.contains(event.target)) {
        setQuickNavOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen, notificationOpen, showSearchResults, quickNavOpen]);

  // Fonction pour gérer la recherche
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setShowSearchResults(true);
    
    try {
      // Simuler un appel API pour la recherche
      setTimeout(() => {
        // Résultats simulés
        const mockResults = [
          { id: 1, type: 'project', title: 'Projet Résidentiel A', path: '/projects/1', icon: <FaProjectDiagram /> },
          { id: 2, type: 'file', title: 'Plan d\'étage.ifc', path: '/files/2', icon: <FaFile /> },
          { id: 3, type: 'task', title: 'Révision structurelle', path: '/tasks/3', icon: <FaCog /> }
        ];
        setSearchResults(mockResults);
        setIsSearching(false);
      }, 500);
    } catch (error) {
      console.error("Erreur lors de la recherche:", error);
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // Calcul de la position du dropdown
  const toggleUserDropdown = () => {
    if (userButtonRef.current) {
      const rect = userButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 10,
        right: window.innerWidth - rect.right - 10
      });
    }
    
    setDropdownOpen(!dropdownOpen);
  };

  // Toggle pour le menu des notifications
  const toggleNotifications = () => {
    setNotificationOpen(!notificationOpen);
    if (!notificationOpen) {
      // Simuler le chargement des notifications
      setIsLoadingNotifications(true);
      setTimeout(() => {
        setNotifications([
          {
            id: 1,
            type: 'info',
            message: 'Nouveau commentaire sur le projet A',
            date: new Date(),
            read: false
          },
          {
            id: 2,
            type: 'warning',
            message: 'Mise à jour requise pour le modèle IFC',
            date: new Date(Date.now() - 3600000),
            read: false
          },
          {
            id: 3,
            type: 'success',
            message: 'Exportation du modèle terminée',
            date: new Date(Date.now() - 86400000),
            read: true
          }
        ]);
        setIsLoadingNotifications(false);
      }, 600);
    }
  };

  // Gestionnaire pour la déconnexion
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };
  
  // Gestionnaire pour la navigation vers les paramètres
  const navigateToSettings = () => {
    navigate('/settings');
    setDropdownOpen(false);
  };
  
  // Gestionnaire pour la navigation vers le profil
  const navigateToProfile = () => {
    navigate('/profile');
    setDropdownOpen(false);
  };

  // Navigation rapide
  const navigationItems = [
    { icon: <FaHome />, label: "Accueil", path: "/dashboard" },
    { icon: <FaProjectDiagram />, label: "Projets", path: "/projects" },
    { icon: <FaCubes />, label: "Maquettes", path: "/maquettes" },
    { icon: <FaTachometerAlt />, label: "Tableau de bord", path: "/dashboard" },
  ];
  
  const quickNav = () => {
    return (
      <motion.div
        className="quick-nav-menu"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        ref={quickNavRef}
      >
        <div className="quick-nav-header">Navigation rapide</div>
        <div className="quick-nav-items">
          {navigationItems.map((item, index) => (
            <div 
              key={index} 
              className="quick-nav-item"
              onClick={() => {
                navigate(item.path);
                setQuickNavOpen(false);
              }}
            >
              <div className="quick-nav-icon">{item.icon}</div>
              <div className="quick-nav-label">{item.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  // Rendu des résultats de recherche
  const renderSearchResults = () => {
    if (!showSearchResults) return null;
    
    return createPortal(
      <motion.div 
        className="search-results-container"
        ref={searchResultsRef}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute',
          top: `${searchInputRef.current?.getBoundingClientRect().bottom + 5}px`,
          left: `${searchInputRef.current?.getBoundingClientRect().left}px`,
          width: `${searchInputRef.current?.offsetWidth}px`,
          zIndex: 1100
        }}
      >
        <div className="search-results-card">
          {isSearching ? (
            <div className="search-loading">
              <FaSpinner className="spinner" />
              <span>Recherche en cours...</span>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <div className="search-results-header">
                {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
              </div>
              <div className="search-results-list">
                {searchResults.map(result => (
                  <div 
                    key={`${result.type}-${result.id}`}
                    className="search-result-item"
                    onClick={() => {
                      navigate(result.path);
                      setShowSearchResults(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="search-result-icon">
                      {result.icon || <FaFile />}
                    </div>
                    <div className="search-result-content">
                      <div className="search-result-title">{result.title}</div>
                      <div className="search-result-type">{result.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="search-no-results">
              <FaSearchMinus />
              <span>Aucun résultat trouvé</span>
            </div>
          )}
        </div>
      </motion.div>,
      document.body
    );
  };

  // Rendu du menu des notifications
  const renderNotificationsMenu = () => {
    if (!notificationOpen) return null;
    
    return (
      <NotificationsMenu 
        notifications={notifications} 
        isLoading={isLoadingNotifications}
        onClose={() => setNotificationOpen(false)}
        onMarkAllRead={() => {
          setUnreadCount(0);
          setNotifications(notifications.map(n => ({ ...n, read: true })));
        }}
      />
    );
  };

  return (
    <motion.header 
      className={`main-header ${isScrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
    >
      <div className="header-left">
        <button 
          aria-label="Toggle Sidebar" 
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
        >
          <FaBars />
        </button>
        
        <div className="header-logo" onClick={() => navigate('/dashboard')}>
          <span className="logo-text">BIM Recovery</span>
        </div>
        
        <nav className="header-nav">
          <button 
            className={`header-nav-item ${quickNavOpen ? 'active' : ''}`}
            onClick={() => setQuickNavOpen(!quickNavOpen)}
          >
            Menu <FaChevronDown className={`icon-chevron ${quickNavOpen ? 'up' : 'down'}`} />
          </button>
          {quickNavOpen && quickNav()}
        </nav>
      </div>

      <div className="header-center">
        <h1 className="page-title">{pageTitle || title || 'BIM Recovery'}</h1>
      </div>
      
      <div className="header-right">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-container">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={texts.search || "Rechercher..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                if (searchTerm.trim() && searchResults.length > 0) {
                  setShowSearchResults(true);
                }
              }}
              className="search-input"
            />
            <button type="submit" className="search-button" aria-label="Rechercher">
              <FaSearch />
            </button>
          </div>
        </form>
        {renderSearchResults()}
        
        <div className="header-actions">
          <button 
            className="action-button theme-toggle" 
            onClick={toggleDarkMode}
            aria-label={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
          
          <button 
            className="action-button notification-button"
            onClick={toggleNotifications}
            ref={notificationRef}
            aria-label="Notifications"
          >
            <FaBell />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>
          {renderNotificationsMenu()}
          
          <button 
            ref={userButtonRef}
            className="user-profile-button"
            onClick={toggleUserDropdown}
            aria-label="Menu utilisateur"
            aria-expanded={dropdownOpen}
          >
            <div className="user-avatar">
              {userData?.avatar ? (
                <img src={userData.avatar} alt={`${userData.firstName || 'Utilisateur'}`} />
              ) : (
                <div className="avatar-placeholder">
                  {userData?.firstName ? userData.firstName.charAt(0) : 'U'}
                </div>
              )}
            </div>
            <span className="user-name">{userData?.firstName || 'Utilisateur'}</span>
            <FaChevronDown className={`icon-chevron ${dropdownOpen ? 'up' : 'down'}`} />
          </button>
        </div>
        
        <AnimatePresence>
          {dropdownOpen && createPortal(
            <motion.div 
              ref={dropdownRef}
              className="user-dropdown"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                top: `${dropdownPosition.top}px`,
                right: `${dropdownPosition.right}px`,
              }}
            >
              <div className="dropdown-header">
                <div className="dropdown-user-avatar">
                  {userData?.avatar ? (
                    <img src={userData.avatar} alt="Avatar utilisateur" />
                  ) : (
                    <div className="avatar-placeholder large">
                      {userData?.firstName ? userData.firstName.charAt(0) : 'U'}
                    </div>
                  )}
                </div>
                <div className="dropdown-user-info">
                  <div className="dropdown-user-name">
                    {userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}` : "Utilisateur"}
                  </div>
                  <div className="dropdown-user-email">
                    {userData?.email || "user@example.com"}
                  </div>
                  <div className="dropdown-user-role">
                    {userData?.roles?.includes('Admin') ? "Administrateur" : "Utilisateur"}
                  </div>
                </div>
              </div>
              
              <div className="dropdown-content">
                <button onClick={navigateToProfile} className="dropdown-item">
                  <FaUser className="dropdown-item-icon" />
                  <span>{texts.profile || "Mon Profil"}</span>
                </button>
                <button onClick={navigateToSettings} className="dropdown-item">
                  <FaCog className="dropdown-item-icon" />
                  <span>{texts.settings || "Paramètres"}</span>
                </button>
                <hr className="dropdown-divider" />
                <button onClick={handleLogout} className="dropdown-item logout-item">
                  <FaSignOutAlt className="dropdown-item-icon" />
                  <span>{texts.logout || "Déconnexion"}</span>
                </button>
              </div>
            </motion.div>,
            document.body
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

// Export du composant Header
export default Header;
