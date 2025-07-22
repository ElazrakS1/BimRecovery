import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CinematicHeader from '../header/CinematicHeader';
import ModernHeader from '../header/ModernHeader';
import HeaderFixed from '../header/HeaderFixed';
// import Header from '../header/Header';  // Ancienne version
import Sidebar from '../sidebar/Sidebar';
import UserProfile from '../users/UserProfile';
import ToastNotifications from '../notifications/ToastNotifications';
import { AuthContext } from '../../context/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAuthenticated, userData: authUserData, checkAuth } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Fonction pour déterminer le titre de la page
  const getPageTitle = (pathname) => {
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
      return 'Profile';
    } else if (pathname === '/tasks') {
      return 'Tâches';
    } else {
      return 'Smart BIM';
    }
  };

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        if (!isAuthenticated) {
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          if (!token) {
            console.log('No authentication token found, redirecting to login');
            navigate('/login');
            return;
          }

          const verified = await checkAuth();
          if (!verified) {
            console.log('Authentication verification failed, redirecting to login');
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        navigate('/login');
      }
    };

    verifyAuth();
  }, [isAuthenticated, navigate, checkAuth]);

  if (!isAuthenticated || !authUserData) {
    return null; // or a loading spinner
  }
  
  console.log('Layout rendering, path:', location.pathname);
  
  return (
    <div className="layout">
      <CinematicHeader onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
      
      <div className="content-wrapper">
        <Sidebar collapsed={sidebarCollapsed} userData={authUserData} />
        <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
          {location.pathname === '/profile' ? (
            <UserProfile />
          ) : (
            <>
              {/* Only show the user profile on settings page */}
              {location.pathname === '/settings' && (
                <UserProfile />
              )}
              {children}
            </>
          )}
        </main>
      </div>
      
      {/* Composant global des notifications toast */}
      <ToastNotifications />
    </div>
  );
};

export default Layout;
