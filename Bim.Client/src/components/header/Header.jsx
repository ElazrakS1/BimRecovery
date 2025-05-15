import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { LanguageContext } from '../../context/LanguageContext';
import './Header.css';

const Header = ({ title, userData }) => {
  const { texts } = useContext(LanguageContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      message: "Nouveau commentaire sur le projet Tour Eiffel",
      time: "Il y a 5 minutes",
      read: false
    },
    {
      id: 2,
      message: "Maquette mise à jour par Jean Dupont",
      time: "Il y a 1 heure",
      read: false
    },
    {
      id: 3,
      message: "Réunion planifiée pour demain à 14h00",
      time: "Il y a 3 heures",
      read: true
    }
  ]);
  
  const unreadCount = notifications.filter(notif => !notif.read).length;
  
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
    if (notificationsOpen) setNotificationsOpen(false);
  };
  
  const toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    if (dropdownOpen) setDropdownOpen(false);
  };
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    if (dropdownOpen || notificationsOpen || showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, notificationsOpen, showSearchResults]);
  
  const handleProfileClick = () => {
    navigate('/settings?tab=account');
    setDropdownOpen(false);
  };
  
  const handleSettingsClick = () => {
 
    setDropdownOpen(false);
  };
  
  const handleLogoutClick = () => {
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
  
  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({...notif, read: true})));
  };
  
  const markAsRead = (id) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? {...notif, read: true} : notif
    ));
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
      
      const response = await fetch(`http://localhost:5258/api/search?q=${encodeURIComponent(term)}`, {
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

  const highlightMatch = (text, term) => {
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

  const handleSearchItemClick = (url) => {
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

  const getNotificationIcon = (message) => {
    if (message.toLowerCase().includes('commentaire')) {
      return 'fa-comment-dots';
    } else if (message.toLowerCase().includes('maquette')) {
      return 'fa-cubes';
    } else if (message.toLowerCase().includes('réunion')) {
      return 'fa-calendar-check';
    } else if (message.toLowerCase().includes('projet')) {
      return 'fa-building';
    } else if (message.toLowerCase().includes('tâche')) {
      return 'fa-clipboard-list';
    }
    return 'fa-bell';
  };
  
  return (
    <header className="main-header">
      <div className={`header-title ${(title === "Profile" || title === texts.settings || title === "Settings") ? "clickable" : ""}`} onClick={handleTitleClick}>
        <h1>{title || "Smart BIM"}</h1>
      </div>
      
      <div className="header-actions">
        <div className="search-box" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <i className="fas fa-search"></i>
            <input 
              type="text" 
              placeholder={texts.search || "Rechercher..."}
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
              {isSearching ? (
                <div className="search-loading">
                  <div className="search-loader"></div>
                  <p>{texts.searching || "Recherche en cours..."}</p>
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="search-results-header">
                    <h3>{texts.searchResults || "Résultats"}</h3>
                  </div>
                  <ul className="search-results-list">
                    {searchResults.map(result => (
                      <li 
                        key={`${result.type}-${result.id}`} 
                        onClick={() => handleSearchItemClick(result.url)}
                      >
                        <i className={`fas ${result.type === 'project' ? 'fa-project-diagram' : 'fa-cube'}`}></i>
                        <div className="search-result-details">
                          <span className="result-name">
                            {highlightMatch(result.name, searchTerm)}
                          </span>
                          <span className="result-type">
                            {result.type === 'project' ? (texts.project || 'Projet') : (texts.model || 'Modèle')}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="search-results-footer">
                    <button onClick={() => navigate(`/search?q=${encodeURIComponent(searchTerm)}`)}>
                      {texts.seeAllResults || "Voir tous les résultats"}
                    </button>
                  </div>
                </>
              ) : searchTerm.trim().length > 0 ? (
                <div className="no-search-results">
                  <p>{texts.noSearchResults || "Aucun résultat trouvé"}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
        
        <div className="notification-icon" ref={notificationRef}>
          <div className="notification-button" onClick={toggleNotifications}>
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </div>
          
          {notificationsOpen && (
            <div className="notifications-dropdown">
              <div className="notification-header">
                <h3>
                  <i className="fas fa-bell"></i>
                  {texts.notifications || "Notifications"}
                </h3>
                {unreadCount > 0 && (
                  <span className="mark-all-read" onClick={markAllAsRead}>
                    <i className="fas fa-check-double"></i>
                    {texts.markAllRead || "Tout marquer comme lu"}
                  </span>
                )}
              </div>
              
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="no-notifications">
                    <i className="fas fa-bell-slash"></i>
                    <p>{texts.noNotifications || "Aucune notification"}</p>
                  </div>
                ) : (
                  <>
                    {notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className={`notification-item ${!notification.read ? 'unread' : ''}`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="notification-content">
                          <div className="notification-message">
                            <i className={`fas ${getNotificationIcon(notification.message)}`}></i>
                            <span>{notification.message}</span>
                          </div>
                          <div className="notification-time">
                            <i className="far fa-clock"></i>
                            <span>{notification.time}</span>
                          </div>
                        </div>
                        {!notification.read && <div className="unread-indicator"></div>}
                      </div>
                    ))}
                  </>
                )}
              </div>
              
              <div className="notification-footer">
                <button className="view-all-notifications" onClick={() => navigate('/notifications')}>
                  {texts.viewAllNotifications || "Voir toutes les notifications"}
                </button>
              </div>
            </div>
          )}
        </div>
        
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
          
          {dropdownOpen && (
            <div className="profile-dropdown">
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
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
