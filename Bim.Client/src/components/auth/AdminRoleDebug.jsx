import React, { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AdminRoleDebug = () => {
  const { userData, isAdmin, refreshUserData } = useContext(AuthContext);
  const [showDetails, setShowDetails] = useState(false);
  
  const hasAdminRole = 
    userData?.isAdmin === true || 
    (userData?.roles?.some(role => typeof role === 'string' && role.toLowerCase() === 'admin')) ||
    userData?.role === 'Admin';
  
  const formatJson = (obj) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (err) {
      return 'Erreur lors du formatage JSON';
    }
  };
  
  const handleRefreshUserData = async () => {
    try {
      await refreshUserData();
      alert('Données utilisateur actualisées');
    } catch (error) {
      alert(`Erreur lors de l'actualisation des données: ${error.message}`);
    }
  };
  
  const handleToggleAdminRole = () => {
    // Cette fonction est uniquement pour les tests en développement
    if (userData) {
      const updatedUserData = { ...userData };
      
      if (!updatedUserData.roles) {
        updatedUserData.roles = [];
      }
      
      if (hasAdminRole) {
        updatedUserData.roles = updatedUserData.roles.filter(r => r !== 'Admin');
        updatedUserData.isAdmin = false;
      } else {
        updatedUserData.roles.push('Admin');
        updatedUserData.isAdmin = true;
      }
      
      localStorage.setItem('debugUserData', JSON.stringify(updatedUserData));
      window.location.reload();
    }
  };

  if (!userData) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999,
      maxWidth: '400px',
      fontSize: '12px'
    }}>
      <div>
        <strong>Statut Admin:</strong> {isAdmin ? '✅ Oui' : '❌ Non'}
        <button 
          onClick={() => setShowDetails(!showDetails)}
          style={{ marginLeft: '10px', cursor: 'pointer', background: 'none', border: '1px solid white', color: 'white', borderRadius: '3px' }}
        >
          {showDetails ? 'Masquer' : 'Détails'}
        </button>
      </div>
      
      {showDetails && (
        <div style={{ marginTop: '10px' }}>
          <div>
            <strong>Email:</strong> {userData.email}
          </div>
          <div>
            <strong>Roles:</strong> {userData.roles ? userData.roles.join(', ') : 'Aucun'}
          </div>
          <div>
            <strong>isAdmin propriété:</strong> {userData.isAdmin ? 'true' : 'false'}
          </div>
          <div style={{ marginTop: '10px' }}>
            <button 
              onClick={handleRefreshUserData}
              style={{ marginRight: '10px', cursor: 'pointer', background: '#2563eb', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '3px' }}
            >
              Actualiser les données
            </button>
            <button 
              onClick={handleToggleAdminRole}
              style={{ cursor: 'pointer', background: '#dc2626', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '3px' }}
            >
              {hasAdminRole ? 'Supprimer' : 'Ajouter'} le rôle Admin
            </button>
          </div>
          
          <div style={{ marginTop: '10px', maxHeight: '200px', overflow: 'auto' }}>
            <strong>Données utilisateur brutes:</strong>
            <pre style={{ fontSize: '10px', whiteSpace: 'pre-wrap' }}>
              {formatJson(userData)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRoleDebug;
