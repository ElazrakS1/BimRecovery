import React, { useState, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars, FaSearch, FaUser, FaBell, FaMoon, FaSun, FaChevronDown } from 'react-icons/fa';
import './NewHeaderSimplified.css';
import { AuthContext } from '../../context/AuthContext';

const NewHeaderSimplified = ({ onToggleSidebar }) => {
  const [searchActive, setSearchActive] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { userData } = useContext(AuthContext);
  const location = useLocation();
  
  // Détecter le scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  return (
    <motion.header 
      className={`simplified-header ${scrolled ? 'scrolled' : ''} ${isDarkMode ? 'dark' : 'light'}`}
      initial={{ y: -70 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Particules flottantes */}
      <div className="particles-container">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>
      
      {/* Section gauche */}
      <div className="header-left">
        <motion.button 
          className="menu-toggle"
          onClick={onToggleSidebar}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <FaBars />
        </motion.button>
        
        <motion.div 
          className="logo"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1, rotateY: [0, 10, 0, -10, 0] }}
          transition={{ 
            duration: 0.5, 
            delay: 0.1,
            rotateY: { duration: 2, delay: 0.5, ease: "easeInOut" }
          }}
        >
          <span>BIM</span>
        </motion.div>
      </div>

      {/* Section centrale - Titre */}
      <motion.div 
        className="header-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [10, 0] }}
        transition={{ 
          duration: 0.5, 
          delay: 0.2,
          y: { type: "spring", stiffness: 300 }
        }}
      >
        <motion.div 
          className="page-title"
          animate={{ 
            textShadow: [
              "0 0 0px rgba(108, 99, 255, 0)", 
              "0 0 5px rgba(108, 99, 255, 0.5)", 
              "0 0 0px rgba(108, 99, 255, 0)"
            ]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            repeatType: "reverse" 
          }}
        >
          {getPageTitle()}
        </motion.div>
      </motion.div>

      {/* Section droite */}
      <div className="header-right">
        {/* Bouton de recherche */}
        <motion.button 
          className="icon-button"
          onClick={() => setSearchActive(!searchActive)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <FaSearch />
        </motion.button>
        
        {/* Bouton de thème */}
        <motion.button 
          className="icon-button"
          onClick={toggleDarkMode}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {isDarkMode ? <FaSun /> : <FaMoon />}
        </motion.button>

        {/* Notifications */}
        <motion.button 
          className="icon-button notification-button"
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <FaBell />
          <motion.span 
            className="notification-badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 500 }}
          >
            2
          </motion.span>
        </motion.button>

        {/* Profil utilisateur */}
        <motion.div 
          className="profile-container"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <motion.button 
            className={`profile-toggle ${profileDropdownOpen ? 'active' : ''}`}
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            whileHover={{ scale: 1.02 }}
          >
            <div className="profile-image">
              <motion.div 
                className="profile-initials"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
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
          
          <AnimatePresence>
            {profileDropdownOpen && (
              <motion.div 
                className="profile-dropdown"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="dropdown-item">Mon Profil</div>
                <div className="dropdown-item">Paramètres</div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item logout">Déconnexion</div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      
      {/* Barre de recherche extensible avec animation */}
      <AnimatePresence>
        {searchActive && (
          <motion.div 
            className="search-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="search-input"
              autoFocus
            />
            <motion.button 
              className="close-search"
              onClick={() => setSearchActive(false)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ×
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default NewHeaderSimplified;
