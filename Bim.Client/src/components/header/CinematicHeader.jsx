import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../../context/AuthContext';
import './CinematicHeader.css';
import { 
  FaSearch, FaBell, FaMoon, FaSun, FaChevronDown, FaBars, 
  FaUser, FaCog, FaSignOutAlt, FaHome, FaRocket, FaRegLightbulb
} from 'react-icons/fa';

// Composant pour les particules animées
const AnimatedParticles = () => {
  return (
    <div className="header-particles">
      {Array.from({ length: 20 }).map((_, i) => (
        <div 
          key={i} 
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 7}s`
          }}
        />
      ))}
    </div>
  );
};

// Composant pour les tooltips
const Tooltip = ({ text }) => (
  <div className="tooltip">
    {text}
    <div className="tooltip-arrow"></div>
  </div>
);

// Composant pour le glow effet
const GlowEffect = ({ position }) => (
  <div className={`glow-effect ${position}`} />
);

// Composant pour le badge de notification animé
const NotificationBadge = ({ count }) => (
  <motion.span 
    className="notification-badge"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ 
      type: "spring", 
      stiffness: 500,
      damping: 15 
    }}
  >
    {count}
  </motion.span>
);

// Composant pour le dropdown de notification
const NotificationDropdown = ({ isVisible, notifications = [] }) => {
  const defaultNotifications = [
    { id: 1, title: 'Nouveau message', message: 'Vous avez un nouveau message de l\'administrateur', time: '2 min', isUnread: true },
    { id: 2, title: 'Tâche terminée', message: 'Analyse de maquette IFC complétée', time: '1 heure', isUnread: true },
    { id: 3, title: 'Rappel', message: 'Réunion de projet demain à 10h00', time: '5 heures', isUnread: false }
  ];

  const notificationsToShow = notifications.length > 0 ? notifications : defaultNotifications;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="notifications-dropdown"
          initial={{ opacity: 0, y: -5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -5, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <div className="notifications-header">
            <h4>Notifications</h4>
            <button className="mark-read-btn">Tout marquer comme lu</button>
          </div>
          <div className="notifications-list">
            {notificationsToShow.map(notification => (
              <div key={notification.id} className={`notification-item ${notification.isUnread ? 'unread' : ''}`}>
                <div className="notification-icon">
                  <div className={`icon-circle ${notification.isUnread ? 'unread' : ''}`}>
                    <FaRegLightbulb />
                  </div>
                </div>
                <div className="notification-content">
                  <h5>{notification.title}</h5>
                  <p>{notification.message}</p>
                  <span className="notification-time">{notification.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="notifications-footer">
            <button>Voir toutes les notifications</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Composant pour l'effet d'onde de recherche
const SearchWaveEffect = () => {
  return (
    <div className="search-wave-effect">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="wave" style={{ animationDelay: `${i * 0.2}s` }}></div>
      ))}
    </div>
  );
};

const CinematicHeader = ({ onToggleSidebar }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(2);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const { userData } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const profileRef = useRef(null);

  // Gérer le scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Gérer les notifications
  useEffect(() => {
    // Si nous avons des notifications non lues, définir hasUnreadNotifications à true
    setHasUnreadNotifications(notificationCount > 0);
    
    // Simuler la récupération des notifications depuis le serveur
    const fetchNotifications = async () => {
      // En situation réelle, cela serait une requête API
      // const response = await api.getNotifications();
      // setNotificationCount(response.unreadCount);
    };
    
    fetchNotifications();
  }, [notificationCount]);

  // Marquer les notifications comme lues
  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (notificationCount > 0 && showNotifications === false) {
      // En situation réelle, vous appelleriez ici une API pour marquer comme lu
      // Simulons ce comportement après un délai
      setTimeout(() => {
        setNotificationCount(0);
        setHasUnreadNotifications(false);
      }, 2000);
    }
  };

  // Obtenir le titre de la page
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

  // Basculer le mode sombre
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode', !isDarkMode);
  };

  // Gérer la recherche
  const handleSearchIconClick = () => {
    setIsSearchExpanded(!isSearchExpanded);
    if (!isSearchExpanded) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  // Gérer le profil
  const handleProfileClick = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
    console.log("Dropdown toggled:", !profileDropdownOpen); // Pour déboguer
  };

  // Navigation
  const navigateTo = (path) => {
    navigate(path);
    setProfileDropdownOpen(false);
  };

  // Déconnexion
  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    navigate('/login');
  };

  // Référence pour le dropdown des notifications
  const notificationRef = useRef(null);

  // Gérer les clics à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Fermer le dropdown du profil si le clic est à l'extérieur
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      
      // Fermer le dropdown des notifications si le clic est à l'extérieur
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <motion.header 
      className={`cinematic-header ${isScrolled ? 'scrolled' : ''}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="header-background">
        <div className="header-glass"></div>
        <AnimatedParticles />
        <GlowEffect position="top-left" />
        <GlowEffect position="top-right" />
      </div>        
      <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
        <div className="header-left">
          <motion.button 
            className="sidebar-toggle tooltip-container"
            onClick={onToggleSidebar}
            whileTap={{ scale: 0.9 }}
            whileHover={{ 
              scale: 1.1,
              backgroundColor: "rgba(99, 102, 241, 0.15)"
            }}
          >
            <FaBars size={24} className="sidebar-icon" />
            <Tooltip text="Menu latéral" />
            <div className="button-highlight"></div>
          </motion.button>
          
          <motion.div 
            className="page-title-container"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <motion.div 
              className="title-highlight"
              animate={{ 
                width: isHovering ? '100%' : '0%',
                opacity: isHovering ? 1 : 0 
              }}
              transition={{ duration: 0.3 }}
            />
            <motion.h1 
              className="page-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {getPageTitle()}
            </motion.h1>
          </motion.div>
        </div>
        
        {/* Barre de recherche déplacée au centre */}
        <div className="header-middle">
          <div className={`search-container ${isSearchExpanded ? 'expanded' : ''}`}>              <motion.button 
                className="search-icon-button tooltip-container"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSearchIconClick}
              >
                <FaSearch size={24} className="search-icon" />
                <Tooltip text="Rechercher" />
                <div className="button-glow"></div>
                {isSearchExpanded && <SearchWaveEffect />}
              </motion.button>
            
            <motion.input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher dans les projets, maquettes, tâches..."
              className="search-input"
              initial={{ width: 0, opacity: 0 }}
              animate={{ 
                width: isSearchExpanded ? '300px' : '0px',
                opacity: isSearchExpanded ? 1 : 0
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
        
        {/* Section icônes et profil à droite */}
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <div className="header-icons" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <motion.button 
              className="icon-button theme-button tooltip-container"
              onClick={toggleDarkMode}
              whileHover={{ 
                scale: 1.1,
                rotate: isDarkMode ? [0, 15, 0, -15, 0] : [0, 15, 0, -15, 0]
              }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.5 }}
            >
              {isDarkMode ? (
                <FaSun size={24} className="sun-icon" />
              ) : (
                <FaMoon size={24} className="moon-icon" />
              )}
              <Tooltip text={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"} />
              <div className="button-highlight"></div>
            </motion.button>
            
            <div className="notification-container tooltip-container" ref={notificationRef}>
              <motion.button 
                className="icon-button notification-button"
                onClick={handleNotificationClick}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                animate={{ y: hasUnreadNotifications ? [0, -3, 0] : 0 }}
                transition={{ 
                  y: { repeat: hasUnreadNotifications ? Infinity : 0, repeatDelay: 2 } 
                }}
              >
                <FaBell size={24} className="bell-icon" />
                <Tooltip text="Notifications" />
                <div className="button-highlight"></div>
                {notificationCount > 0 && <NotificationBadge count={notificationCount} />}
              </motion.button>
              <NotificationDropdown isVisible={showNotifications} />
            </div>
          </div>
          
          <div className="header-right" style={{ width: '130px', display: 'flex', justifyContent: 'flex-end', position: 'relative', zIndex: 1001 }}>
            <div className={`profile-dropdown ${profileDropdownOpen ? 'active' : ''}`} ref={profileRef} style={{ width: '100%', position: 'relative' }}>
              <motion.button 
                className={`profile-button ${profileDropdownOpen ? 'active' : ''}`}
                onClick={handleProfileClick}
                whileHover={{ backgroundColor: profileDropdownOpen ? "var(--header-glass-light)" : "rgba(99, 102, 241, 0.1)" }}
                whileTap={{ scale: 0.98 }}
                style={{
                  backgroundColor: profileDropdownOpen ? "var(--header-glass-light)" : "transparent",
                  borderBottom: profileDropdownOpen ? "none" : "none",
                  width: "100%",
                  justifyContent: "flex-end",
                  paddingRight: '5px',
                  paddingLeft: '5px'
                }}
              >
                <div className="profile-avatar">
                  {userData?.avatar ? (
                    <img src={userData.avatar} alt="Avatar" />
                  ) : (
                    <FaUser size={20} />
                  )}
                </div>
                <span className="profile-name">{userData?.name || 'User'}</span>
                <motion.div
                  animate={{ rotate: profileDropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FaChevronDown size={16} className="dropdown-arrow" />
                </motion.div>
              </motion.button>
              
              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div 
                    className="dropdown-menu"
                    initial={{ opacity: 0, y: -5, scale: 0.95, transformOrigin: "top right" }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    style={{ 
                      boxShadow: "0 10px 25px rgba(0,0,0,0.15)", 
                      border: "1px solid rgba(99, 102, 241, 0.1)" 
                    }}
                  >
                    <div className="dropdown-header">
                      <div className="dropdown-avatar">
                        <div className="avatar-container">
                          {userData?.avatar ? (
                            <img src={userData.avatar} alt="Avatar" />
                          ) : (
                            <FaUser size={28} />
                          )}
                          <div className="avatar-glow"></div>
                        </div>
                      </div>
                      <div className="dropdown-user-info">
                        <h4>{userData?.name || 'Utilisateur'}</h4>
                        <p>{userData?.email || 'utilisateur@example.com'}</p>
                      </div>
                    </div>
                    
                    <ul className="dropdown-items">
                      <motion.li 
                        onClick={() => navigateTo('/profile')}
                        whileHover={{ 
                          backgroundColor: "rgba(99, 102, 241, 0.1)",
                          x: 5
                        }}
                      >
                        <FaUser size={18} />
                        <span>Profil</span>
                      </motion.li>
                      <motion.li 
                        onClick={() => navigateTo('/settings')}
                        whileHover={{ 
                          backgroundColor: "rgba(99, 102, 241, 0.1)",
                          x: 5
                        }}
                      >
                        <FaCog size={18} />
                        <span>Paramètres</span>
                      </motion.li>
                      <li className="dropdown-divider"></li>
                      <motion.li 
                        onClick={logout}
                        whileHover={{ 
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          x: 5,
                          color: "rgb(239, 68, 68)"
                        }}
                      >
                        <FaSignOutAlt size={18} />
                        <span>Déconnexion</span>
                      </motion.li>
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default CinematicHeader;
