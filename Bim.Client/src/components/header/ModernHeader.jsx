import React, { useState, useContext, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './ModernHeader.css';
import { 
  FaSearch, 
  FaBell, 
  FaMoon, 
  FaSun, 
  FaChevronDown, 
  FaBars, 
  FaUser, 
  FaCog, 
  FaSignOutAlt, 
  FaHome 
} from 'react-icons/fa';

const ModernHeader = ({ onToggleSidebar }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(2);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { userData } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const profileRef = useRef(null);

  const getPageTitle = () => {
    const pathname = location.pathname;
    if (pathname === '/' || pathname === '/dashboard') {
      return 'Dashboard';
    } else if (pathname === '/maquettes') {
      return 'Maquettes';
    } else if (pathname === '/projects') {
      return 'Projets';
    } else if (pathname.startsWith('/projects/')) {
      return 'Détails du Projet';
    } else if (pathname === '/settings') {
      return 'Paramètres';
    } else if (pathname === '/profile') {
      return 'Profil';
    } else if (pathname === '/tasks') {
      return 'Tâches';
    } else {
      return 'Smart BIM';
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode');
  };

  // Fonction pour naviguer vers la page d'accueil en cliquant sur le logo
  const goToHome = () => {
    navigate('/dashboard');
  };

  // Effet pour fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownOpen && profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      
      if (isSearchExpanded && searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setIsSearchExpanded(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen, isSearchExpanded]);
  
  // Effet pour appliquer le mode sombre au chargement si préférence utilisateur
  useEffect(() => {
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDarkMode) {
      setIsDarkMode(true);
      document.body.classList.add('dark-mode');
    }
  }, []);
  
  // Animation du titre de page lors du changement de route
  useEffect(() => {
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
      pageTitle.style.animation = 'none';
      // Force a reflow to apply the style change
      void pageTitle.offsetWidth;
      pageTitle.style.animation = 'titleSlide 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
    }
  }, [location.pathname]);

  // Fonction pour gérer l'expansion de la recherche
  const handleSearchClick = () => {
    setIsSearchExpanded(!isSearchExpanded);
    // Focus sur l'input si on ouvre la recherche
    if (!isSearchExpanded && searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 100);
    }
  };
  
  // Force la visibilité des icônes et notifications
  useEffect(() => {
    // Force l'opacité des boutons d'icônes à 1
    const buttons = document.querySelectorAll('.icon-button');
    buttons.forEach(button => {
      button.style.opacity = '1';
      button.style.visibility = 'visible';
    });
    
    // S'assure que le badge de notification est visible
    const badge = document.querySelector('.badge');
    if (badge) {
      badge.style.opacity = '1';
      badge.style.visibility = 'visible';
      badge.style.display = 'flex';
    }
  }, []);

  // Fonction de déconnexion
  const handleLogout = () => {
    // Logique de déconnexion à implémenter selon votre système d'authentification
    navigate('/login');
  };

  return (
    <header className={`modern-header ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Section gauche */}
      <div className="header-section left">
        <button 
          className="menu-button" 
          onClick={onToggleSidebar}
          title="Menu principal"
        >
          <FaBars />
        </button>
        <div className="logo" onClick={goToHome}>
          <span className="logo-text">BIM RECOVERY</span>
        </div>
      </div>

      {/* Section centrale */}
      <div className="header-section center">
        <h1 className="page-title">{getPageTitle()}</h1>
      </div>

      {/* Section droite */}
      <div className="header-section right">
        {/* Conteneur des boutons avec style moderne et premium */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          marginRight: '8px'
        }}>
          {/* Bouton de recherche - Design moderne */}
          <button 
            className="icon-button search-button"
            onClick={handleSearchClick}
            title="Rechercher"
            aria-label="Rechercher"
          >
            <FaSearch />
          </button>
          
          {/* Bouton de thème - Design moderne */}
          <button 
            className="icon-button theme-button" 
            onClick={toggleDarkMode}
            title={isDarkMode ? "Mode clair" : "Mode sombre"}
            aria-label={isDarkMode ? "Activer le mode clair" : "Activer le mode sombre"}
          >
            {isDarkMode ? <FaSun /> : <FaMoon />}
          </button>
          
          {/* Bouton de notification - Design moderne */}
          <button 
            className="icon-button notification"
            title="Notifications"
            aria-label={`${notificationCount} notifications non lues`}
          >
            <FaBell />
            {notificationCount > 0 && (
              <span className="badge">
                {notificationCount}
              </span>
            )}
          </button>
        </div>
        
        {/* Champ de recherche expandable */}
        {isSearchExpanded && (
          <div 
            className="search-container expanded"
            ref={searchInputRef}
            style={{ 
              position: 'absolute',
              right: '150px',
              top: '11px',
              backgroundColor: 'white',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(82, 80, 205, 0.2)',
              zIndex: 100,
              width: '220px',
              height: '42px'
            }}
          >
            <input 
              type="text" 
              className="search-input" 
              placeholder="Rechercher..." 
              autoFocus
              style={{ padding: '10px 15px' }}
            />
          </div>
        )}
        
        <div className="profile" ref={profileRef}>
          <button 
            className="profile-button"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            title="Menu du profil"
          >
            <div className="avatar">
              {userData?.firstName?.charAt(0) || 'S'}
            </div>
            <span className="name">{userData?.firstName || 'Salah-Eddine'}</span>
            <FaChevronDown className="arrow" />
          </button>
          
          {profileDropdownOpen && (
            <div className="dropdown">
              <div className="dropdown-item" onClick={() => navigate('/profile')}>
                <FaUser style={{marginRight: '10px'}} /> Mon Profil
              </div>
              <div className="dropdown-item" onClick={() => navigate('/settings')}>
                <FaCog style={{marginRight: '10px'}} /> Paramètres
              </div>
              <div className="dropdown-item" onClick={() => navigate('/dashboard')}>
                <FaHome style={{marginRight: '10px'}} /> Dashboard
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item logout" onClick={handleLogout}>
                <FaSignOutAlt style={{marginRight: '10px'}} /> Déconnexion
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default ModernHeader;
