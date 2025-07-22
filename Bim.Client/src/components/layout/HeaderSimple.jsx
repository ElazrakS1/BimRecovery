import React from 'react';
import { useLocation } from 'react-router-dom';

// Styles en ligne pour éviter les problèmes d'import CSS
const headerStyles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '70px',
    padding: '0 24px',
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
    position: 'sticky',
    top: 0,
    width: '100%',
    zIndex: 1000,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  },
  headerCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 2,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  logo: {
    fontWeight: 700,
    fontSize: '1.5rem',
    color: '#5250cd',
    marginRight: '20px',
  },
  pageTitle: {
    fontWeight: 600,
    fontSize: '1.3rem',
  },
  button: {
    background: 'none',
    border: 'none',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    color: '#333',
    marginLeft: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  buttonHover: {
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    color: '#5250cd',
  },
  notification: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    width: '18px',
    height: '18px',
    backgroundColor: '#ff4757',
    color: 'white',
    fontSize: '0.7rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
  },
  profile: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: '30px',
    background: 'rgba(0, 0, 0, 0.03)',
    marginLeft: '16px',
    cursor: 'pointer',
  },
  profileImage: {
    width: '35px',
    height: '35px',
    borderRadius: '50%',
    background: 'linear-gradient(45deg, #5250cd, #6c63ff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 600,
  },
  profileName: {
    marginLeft: '10px',
    fontWeight: 500,
  },
  menuButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    color: '#333',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px',
  },
};

const HeaderSimple = ({ onToggleSidebar }) => {
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
    <header style={headerStyles.header}>
      <div style={headerStyles.headerLeft}>
        <button 
          style={headerStyles.menuButton} 
          onClick={onToggleSidebar}
        >
          ≡
        </button>
        <div style={headerStyles.logo}>BIM</div>
      </div>

      <div style={headerStyles.headerCenter}>
        <div style={headerStyles.pageTitle}>
          {getPageTitle()}
        </div>
      </div>

      <div style={headerStyles.headerRight}>
        <button style={headerStyles.button}>
          🔍
        </button>
        <button style={headerStyles.button}>
          🌙
        </button>
        <button style={{...headerStyles.button, ...headerStyles.notification}}>
          🔔
          <span style={headerStyles.badge}>2</span>
        </button>
        <div style={headerStyles.profile}>
          <div style={headerStyles.profileImage}>U</div>
          <span style={headerStyles.profileName}>Utilisateur</span>
        </div>
      </div>
    </header>
  );
};

export default HeaderSimple;
