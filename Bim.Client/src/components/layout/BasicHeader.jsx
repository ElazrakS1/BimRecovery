import React from 'react';
import { useLocation } from 'react-router-dom';
import './BasicHeader.css';

const BasicHeader = ({ onToggleSidebar }) => {
  const location = useLocation();
  
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
    <header className="basic-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onToggleSidebar}>
          ≡
        </button>
        <div className="logo">BIM</div>
      </div>

      <div className="header-center">
        <div className="page-title">{getPageTitle()}</div>
      </div>

      <div className="header-right">
        <button className="icon-button">🔍</button>
        <button className="icon-button">🌙</button>
        <div className="notification-button">
          🔔
          <span className="notification-badge">2</span>
        </div>
        <div className="profile-toggle">
          <div className="profile-image">U</div>
          <span className="profile-name">Utilisateur</span>
        </div>
      </div>
    </header>
  );
};

export default BasicHeader;
