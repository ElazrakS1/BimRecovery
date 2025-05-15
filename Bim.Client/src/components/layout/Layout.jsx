import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../header/Header';
import Sidebar from '../sidebar/Sidebar';
import './Layout.css';

const Layout = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Fonction pour déterminer le titre de la page
  const getPageTitle = (pathname) => {
    switch(pathname) {
      case '/':
      case '/dashboard':
        return 'Dashboard';
      case '/maquettes':
        return 'Maquettes';
      case '/projects':
        return 'Projets';
      case '/settings':
        return 'Paramètres';
      case '/profile':
        return 'Profile';
      default:
        return 'Smart BIM';
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch('https://localhost:7258/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Failed to fetch user data');
        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/login');
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleSidebarCollapse = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  return (
    <div className="app-container">
      <Header 
        title={getPageTitle(location.pathname)}
        userData={userData} 
      />
      <div className={`content-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar 
          userData={userData} 
          onCollapse={handleSidebarCollapse}
          collapsed={sidebarCollapsed}
        />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
