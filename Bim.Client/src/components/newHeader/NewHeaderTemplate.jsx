import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './NewHeader.css';

/**
 * Nouveau composant Header pour BIM Recovery
 * 
 * Ce composant sera le point de départ pour la reconstruction du header.
 * Il contient la structure de base que vous pourrez étendre et personnaliser.
 */
const NewHeader = ({ 
  pageTitle = 'BIM Recovery',  // Titre de la page
  userData = {},               // Données de l'utilisateur connecté
  onToggleSidebar = () => {}   // Fonction pour basculer la barre latérale
}) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // Gestion du défilement
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Gestion de la recherche
  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Recherche:', searchTerm);
    // Implémentez la logique de recherche ici
  };
  
  // Navigation
  const handleNavigation = (path) => {
    navigate(path);
  };
  
  // Fermeture du menu utilisateur en cliquant ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      const userMenu = document.getElementById('user-menu');
      if (userMenu && !userMenu.contains(event.target) && userMenuOpen) {
        setUserMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);
  
  return (
    <header className={`new-header ${isScrolled ? 'scrolled' : ''}`}>
      {/* Fond animé - à implémenter selon votre design */}
      <div className="header-background">
        {/* Ajoutez des éléments d'animation ici */}
      </div>
      
      {/* Contenu principal du header */}
      <div className="header-container">
        {/* Partie gauche */}
        <div className="header-left">
          {/* Bouton de toggle sidebar */}
          <button 
            className="sidebar-toggle" 
            onClick={onToggleSidebar}
            aria-label="Toggle Sidebar"
          >
            <span className="toggle-icon">≡</span>
          </button>
          
          {/* Logo / Titre */}
          <div className="header-logo" onClick={() => handleNavigation('/dashboard')}>
            <span className="logo-text">{pageTitle}</span>
          </div>
        </div>
        
        {/* Partie centrale */}
        <div className="header-center">
          {/* Zone de recherche */}
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              🔍
            </button>
          </form>
        </div>
        
        {/* Partie droite */}
        <div className="header-right">
          {/* Notifications - à implémenter */}
          <button className="header-button notifications-button">
            🔔
          </button>
          
          {/* Menu utilisateur */}
          <div className="user-menu-container" id="user-menu">
            <button 
              className="user-button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              {userData.avatar ? (
                <img 
                  src={userData.avatar} 
                  alt="Avatar" 
                  className="user-avatar" 
                />
              ) : (
                <div className="user-avatar-placeholder">
                  {userData.firstName ? userData.firstName.charAt(0) : 'U'}
                </div>
              )}
            </button>
            
            {userMenuOpen && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <div className="user-info">
                    <span className="user-name">
                      {userData.firstName ? `${userData.firstName} ${userData.lastName || ''}` : 'Utilisateur'}
                    </span>
                    <span className="user-email">
                      {userData.email || 'email@exemple.com'}
                    </span>
                  </div>
                </div>
                <div className="user-dropdown-menu">
                  <button onClick={() => handleNavigation('/profile')}>
                    Profil
                  </button>
                  <button onClick={() => handleNavigation('/settings')}>
                    Paramètres
                  </button>
                  <hr className="menu-divider" />
                  <button className="logout-button">
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default NewHeader;
