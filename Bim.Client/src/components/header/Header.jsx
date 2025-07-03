import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { LanguageContext } from '../../context/LanguageContext';
import { API_BASE_URL } from '../../config/api.config';
import NotificationsMenu from '../notifications/NotificationsMenu';
import './Header.css';

const Header = ({ title, userData, pageTitle, onToggleSidebar }) => {
  const { texts } = useContext(LanguageContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);
    const toggleDropdown = (e) => {
    e.stopPropagation(); // Empêcher la propagation du clic
    setDropdownOpen(!dropdownOpen);
  };
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    // Toujours ajouter les événements, pas seulement si le dropdown est ouvert
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleProfileClick = (e) => {
    e.stopPropagation(); // Empêcher la propagation de l'événement
    navigate('/settings?tab=account');
    setDropdownOpen(false);
  };
  
  const handleSettingsClick = (e) => {
    e.stopPropagation(); // Empêcher la propagation de l'événement
    navigate('/settings');
    setDropdownOpen(false);
  };
  
  const handleLogoutClick = (e) => {
    e.stopPropagation(); // Empêcher la propagation de l'événement
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    navigate('/login');
    setDropdownOpen(false);
  };
  const handleTitleClick = () => {
    if (title === "Profile" || title === texts.settings || title === "Settings") {
      navigate('/dashboard');
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (value.trim().length > 0) {
      setIsSearching(true);
      setShowSearchResults(true);
      
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
      setIsSearching(false);
    }
  };
  
  const performSearch = async (term) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const normalizedTerm = term.toLowerCase().trim();
      
      const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(term)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const filteredResults = data.filter(item => 
          item.name.toLowerCase().includes(normalizedTerm)
        );
        setSearchResults(filteredResults);
      } else {
        const demoResults = [
          { id: 1, type: 'project', name: 'Tour Eiffel Rénovation', url: '/projects/1' },
          { id: 2, type: 'project', name: 'Centre Commercial', url: '/projects/3' },
          { id: 3, type: 'model', name: 'Étage 1 - Tour Eiffel', url: '/models/1' },
          { id: 4, type: 'project', name: 'Immeuble Résidentiel Haussmann', url: '/projects/4' },
          { id: 5, type: 'model', name: 'Fondations Centre Commercial', url: '/models/5' }
        ];
        
        const filteredResults = demoResults.filter(item => 
          item.name.toLowerCase().includes(normalizedTerm)
        );
        
        setSearchResults(filteredResults);
      }
    } catch (error) {
      console.error('Search error:', error);
      const fallbackResults = [
        { id: 1, type: 'project', name: 'Tour Eiffel Rénovation', url: '/projects/1' },
        { id: 2, type: 'project', name: 'Centre Commercial', url: '/projects/3' }
      ];
      
      const filteredFallback = fallbackResults.filter(item => 
        item.name.toLowerCase().includes(term.toLowerCase())
      );
      
      setSearchResults(filteredFallback);
    } finally {
      setIsSearching(false);
    }
  };
  const _highlightMatch = (text, term) => {
    if (!term.trim()) return text;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? <mark key={i}>{part}</mark> : part
        )}
      </>
    );
  };

  const _handleSearchItemClick = (url) => {
    setShowSearchResults(false);
    setSearchTerm('');
    navigate(url);
  };
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
      setShowSearchResults(false);
    }
  };

  return (
    <header className="main-header">
      {/* Section Gauche - Navigation */}
      <div className="header-left">
        <div className="sidebar-toggle" onClick={onToggleSidebar}>
          <i className={`fas fa-bars`}></i>
        </div>
        <div className={`header-title ${(title === "Profile" || title === texts.settings || title === "Settings") ? "clickable" : ""}`} onClick={handleTitleClick}>
          <h1>{title || pageTitle || "Smart BIM"}</h1>
        </div>
      </div>

      {/* Section Centre - Recherche */}
      <div className="header-center">
        <div className="search-box" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <i className="fas fa-search"></i>
            <input 
              type="text" 
              placeholder={texts.searchPlaceholder || "Rechercher des projets, tâches, documents..."}
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchTerm.trim().length > 0) {
                  setShowSearchResults(true);
                }
              }}
            />
          </form>
          
          {showSearchResults && (
            <div className="search-results-dropdown">
              <div className="search-results-header">
                <h3>
                  <i className="fas fa-search"></i>
                  {texts.searchResults || "Résultats de recherche"}
                </h3>
              </div>
              <ul className="search-results-list">
                {isSearching ? (
                  <li className="search-loading">
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>{texts.searching || "Recherche en cours..."}</span>
                  </li>
                ) : searchResults.length > 0 ? (
                  searchResults.map(result => (
                    <li key={result.id} onClick={() => navigate(result.url)}>
                      <i className={`fas ${result.icon || 'fa-file'}`}></i>
                      <div className="search-result-content">
                        <span className="search-result-title">{result.name}</span>
                        <span className="search-result-type">{result.type}</span>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="no-results">
                    <i className="fas fa-search-minus"></i>
                    <span>{texts.noResults || "Aucun résultat trouvé"}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>      {/* Section Droite - Notifications & Profil */}
      <div className="header-right">
          <NotificationsMenu />
        
        <div className="user-profile" ref={dropdownRef}>
          <div 
            className={`profile-info ${dropdownOpen ? 'active' : ''}`} 
            onClick={toggleDropdown}
          >
            <div className="profile-info-left">
              {userData?.profilePhoto ? (
                <img 
                  src={userData.profilePhoto} 
                  alt="Avatar" 
                  className="avatar-img" 
                />
              ) : (
                <div className="avatar">
                  {userData?.firstName?.[0]}{userData?.lastName?.[0]}
                </div>
              )}
              <span className="user-name">{userData?.firstName} {userData?.lastName}</span>
            </div>
            <i className={`fas fa-chevron-${dropdownOpen ? 'up' : 'down'}`}></i>
          </div>
          
          {/* Suppression de la condition pour toujours afficher le dropdown (avec visibilité CSS) */}
          <div className={`profile-dropdown ${dropdownOpen ? 'visible' : 'hidden'}`}>
            <div className="dropdown-header">
              <div className="dropdown-user-info">
                {userData?.profilePhoto ? (
                  <img 
                    src={userData.profilePhoto} 
                    alt="Avatar" 
                    className="dropdown-avatar-img" 
                  />
                ) : (
                  <div className="dropdown-avatar">
                    {userData?.firstName?.[0]}{userData?.lastName?.[0]}
                  </div>
                )}
                <div className="dropdown-user-details">
                  <p className="dropdown-name">{userData?.firstName} {userData?.lastName}</p>
                  <p className="dropdown-email">{userData?.email}</p>
                </div>
              </div>
            </div>
            <ul className="dropdown-menu">
              <li onClick={handleProfileClick}>
                <i className="fas fa-user"></i>
                <span>{texts.profile || "Profil"}</span>
              </li>
              <li onClick={handleSettingsClick}>
                <i className="fas fa-cog"></i>
                <span>{texts.settings || "Paramètres"}</span>
              </li>
              <li className="divider"></li>
              <li className="logout-item" onClick={handleLogoutClick}>
                <i className="fas fa-sign-out-alt"></i>
                <span>{texts.logout || "Déconnexion"}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
