import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars, FaSearch, FaUser, FaBell, FaMoon, FaSun, FaChevronDown, 
         FaCube, FaProjectDiagram, FaTasks, FaHome, FaCog } from 'react-icons/fa';
import './NewHeader.css';
import { AuthContext } from '../../context/AuthContext';

const NewHeader = ({ onToggleSidebar }) => {
  const [searchActive, setSearchActive] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { userData } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Détecter le scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fermer les dropdowns quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.profile-container')) {
        setProfileDropdownOpen(false);
      }
      if (!event.target.closest('.notifications-container')) {
        setNotificationsOpen(false);
      }
      if (!event.target.closest('.main-menu') && !event.target.closest('.menu-toggle')) {
        setMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode');
  };

  // Déterminer le titre de la page
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
  
  // Animation lettre par lettre pour le titre
  const AnimatedText = ({ text }) => {
    return (
      <div className="animated-text">
        {text.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: i * 0.04,
              type: "spring",
              damping: 12
            }}
            className="animated-letter"
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </div>
    );
  };

  return (
    <motion.header 
      className={`new-header ${scrolled ? 'scrolled' : ''} ${isDarkMode ? 'dark' : 'light'}`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Particules animées dans le header */}
      <div className="header-particles">
        {[...Array(10)].map((_, i) => (
          <motion.div 
            key={i}
            className="particle"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * 70,
              opacity: Math.random() * 0.6 + 0.2
            }}
            animate={{ 
              y: [Math.random() * 70, Math.random() * 70 - 20, Math.random() * 70],
              x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth + 50, Math.random() * window.innerWidth],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: Math.random() * 20 + 10,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Section gauche */}
      <div className="header-left">
        <motion.button 
          className="menu-toggle cinematic-button"
          onClick={() => setMenuOpen(!menuOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            animate={{ rotate: menuOpen ? 90 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <FaBars />
          </motion.div>
        </motion.button>
        
        <motion.div 
          className="logo-3d-container"
          initial={{ scale: 0 }}
          animate={{ 
            scale: [0, 1.2, 1],
            rotate: [0, 10, 0]
          }}
          transition={{ 
            duration: 1,
            ease: "easeOut"
          }}
        >
          <div className="logo-3d-inner">
            <div className="logo-3d-face front">BIM</div>
            <div className="logo-glow"></div>
          </div>
        </motion.div>
      </div>

      {/* Section centrale - Titre */}
      <motion.div 
        className="header-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="page-title-container">
          <AnimatedText text={getPageTitle()} />
          
          {/* Ligne décorative sous le titre */}
          <motion.div 
            className="title-underline-container"
          >
            <motion.div 
              className="title-underline"
              initial={{ width: "0%", x: "-50%" }}
              animate={{ width: "120%", x: "0%" }}
              transition={{ delay: 0.7, duration: 1 }}
            />
            <motion.div 
              className="title-underline-glow"
              initial={{ width: "0%", opacity: 0 }}
              animate={{ 
                width: "100%", 
                opacity: [0, 1, 0],
                x: ["-100%", "0%", "100%"]
              }}
              transition={{ 
                delay: 1.5, 
                duration: 2, 
                repeat: Infinity,
                repeatDelay: 3
              }}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Section droite */}
      <div className="header-right">
        {/* Bouton de recherche */}
        <motion.button 
          className="search-toggle cinematic-button"
          onClick={() => setSearchActive(!searchActive)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <FaSearch />
        </motion.button>
        
        {/* Bouton de thème */}
        <motion.button 
          className="theme-toggle cinematic-button"
          onClick={toggleDarkMode}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {isDarkMode ? <FaSun /> : <FaMoon />}
        </motion.button>

        {/* Notifications */}
        <motion.button 
          className="notifications-toggle cinematic-button"
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <FaBell />
          <motion.span 
            className="notification-badge"
            initial={{ scale: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
              transition: { duration: 0.5 }
            }}
          >
            2
          </motion.span>
        </motion.button>

        {/* Profil utilisateur */}
        <motion.div 
          className="profile-container"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <motion.button 
            className={`profile-toggle ${profileDropdownOpen ? 'active' : ''}`}
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="profile-image-container">
              <motion.div 
                className="profile-initials"
                animate={{ 
                  scale: [1, 1.1, 1],
                  transition: { 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }
                }}
              >
                {userData?.firstName?.charAt(0) || 'U'}
              </motion.div>
            </div>
            
            <span className="profile-name">
              {userData?.firstName || 'Utilisateur'}
            </span>
            
            <motion.span 
              className="dropdown-arrow"
              animate={{ rotate: profileDropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <FaChevronDown />
            </motion.span>
          </motion.button>
        </motion.div>
      </div>
      
      {/* Menu principal */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            className="main-menu"
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="menu-header">
              <h3>Navigation</h3>
              <motion.button 
                className="menu-close"
                onClick={() => setMenuOpen(false)}
                whileHover={{ rotate: 90 }}
              >
                <span>×</span>
              </motion.button>
            </div>
            
            <div className="menu-items-container">
              {[
                { icon: <FaHome />, text: 'Dashboard', path: '/dashboard' },
                { icon: <FaCube />, text: 'Maquettes', path: '/maquettes' },
                { icon: <FaProjectDiagram />, text: 'Projets', path: '/projects' },
                { icon: <FaTasks />, text: 'Tâches', path: '/tasks' },
                { icon: <FaCog />, text: 'Paramètres', path: '/settings' }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => {
                    navigate(item.path);
                    setMenuOpen(false);
                  }}
                >
                  <span className="menu-item-icon">{item.icon}</span>
                  <span className="menu-item-text">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown des notifications */}
      <AnimatePresence>
        {notificationsOpen && (
          <motion.div 
            className="notifications-dropdown"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <div className="notifications-header">
              <h3>Notifications</h3>
            </div>
            
            <div className="notification-items-wrapper">
              {[
                {
                  icon: "🏗️",
                  title: "Nouveau projet ajouté:",
                  content: "Tour Eiffel",
                  time: "Il y a 2 heures",
                  unread: true
                },
                {
                  icon: "📋",
                  title: "Tâche assignée:",
                  content: "Analyse structurelle",
                  time: "Il y a 1 jour",
                  unread: true
                },
                {
                  icon: "💬",
                  title: "Nouveau message de",
                  content: "Jean Dupont",
                  time: "Il y a 3 jours",
                  unread: false
                }
              ].map((notification, index) => (
                <motion.div 
                  key={index}
                  className={`notification-item ${notification.unread ? 'unread' : ''}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="notification-icon">
                    {notification.icon}
                  </div>
                  <div className="notification-content">
                    <p>
                      {notification.title} <strong>{notification.content}</strong>
                      {notification.unread && <span className="unread-dot" />}
                    </p>
                    <span className="notification-time">{notification.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown du profil */}
      <AnimatePresence>
        {profileDropdownOpen && (
          <motion.div 
            className="profile-dropdown"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <div className="profile-info">
              <div className="profile-large-image">
                <div className="profile-initials large">
                  {userData?.firstName?.charAt(0) || 'U'}
                </div>
              </div>
              <h3>{userData?.firstName} {userData?.lastName}</h3>
              <p>{userData?.email || 'utilisateur@example.com'}</p>
            </div>
            
            <div className="profile-links">
              <motion.div 
                className="profile-link"
                whileHover={{ x: 5 }}
                onClick={() => navigate('/profile')}
              >
                <FaUser /> Mon Profil
              </motion.div>
              <motion.div 
                className="profile-link"
                whileHover={{ x: 5 }}
                onClick={() => navigate('/settings')}
              >
                <FaCog /> Paramètres
              </motion.div>
              <motion.div 
                className="profile-link logout"
                whileHover={{ x: 5 }}
              >
                <FaUser /> Déconnexion
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default NewHeader;
