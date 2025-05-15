import React, { useState, useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LanguageContext } from '../../context/LanguageContext';
import './Sidebar.css';
import logoSame from '../../assets/logosame.png';

const Sidebar = ({ userData, collapsed, onCollapse }) => {
  const { texts } = useContext(LanguageContext);
  const navigate = useNavigate();
  
  const handleToggleCollapse = () => {
    onCollapse(!collapsed);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    navigate('/login');
  };
  
  const isAdmin = userData?.roles?.includes('Admin');
  
  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <img src={logoSame} alt="Smart BIM Logo" className="sidebar-logo" />
        {!collapsed && <h2>Smart BIM</h2>}
        <button 
          className="collapse-btn" 
          onClick={handleToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`fas fa-${collapsed ? 'chevron-right' : 'chevron-left'}`}></i>
        </button>
      </div>
      
      <div className="sidebar-menu">
        <NavLink to="/dashboard" className={({isActive}) => `menu-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-tachometer-alt"></i>
          {!collapsed && <span>{texts.dashboard || 'Dashboard'}</span>}
        </NavLink>
        
        <NavLink to="/projects" className={({isActive}) => `menu-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-project-diagram"></i>
          {!collapsed && <span>{texts.projects || 'Projects'}</span>}
        </NavLink>
        
        {isAdmin && (
          <>
            <NavLink to="/maquettes" className={({isActive}) => `menu-item ${isActive ? 'active' : ''}`}>
              <i className="fas fa-cubes"></i>
              {!collapsed && <span>{texts.maquettes || 'Maquettes'}</span>}
            </NavLink>
            
            <NavLink to="/users" className={({isActive}) => `menu-item ${isActive ? 'active' : ''}`}>
              <i className="fas fa-users-cog"></i>
              {!collapsed && <span>{texts.users || 'Utilisateurs'}</span>}
            </NavLink>
            
            <NavLink to="/analytics" className={({isActive}) => `menu-item ${isActive ? 'active' : ''}`}>
              <i className="fas fa-chart-line"></i>
              {!collapsed && <span>{texts.analytics || 'Analytiques'}</span>}
            </NavLink>
          </>
        )}
        
        <NavLink to="/documents" className={({isActive}) => `menu-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-file-contract"></i>
          {!collapsed && <span>{texts.documents || 'Documents'}</span>}
        </NavLink>
        
        <NavLink to="/tasks" className={({isActive}) => `menu-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-clipboard-check"></i>
          {!collapsed && <span>{texts.tasks || 'Tâches'}</span>}
        </NavLink>
        
        <NavLink to="/settings" className={({isActive}) => `menu-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-sliders-h"></i>
          {!collapsed && <span>{texts.settings || 'Paramètres'}</span>}
        </NavLink>
      </div>
      
      <div className="sidebar-footer">
        <button className="menu-item logout" onClick={handleLogout}>
          <i className="fas fa-power-off"></i>
          {!collapsed && <span>{texts.logout || 'Déconnexion'}</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;