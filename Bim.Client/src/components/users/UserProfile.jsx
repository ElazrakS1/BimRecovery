import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import useAdminAuth from '../../hooks/useAdminAuth';
import './UserProfile.css';

/**
 * Component that displays the current user's profile with role information
 */
const UserProfile = () => {
  const { userData } = useContext(AuthContext);
  const { roles } = useAdminAuth();

  if (!userData) {
    return (
      <div className="user-profile">
        <div className="user-info">
          <div className="user-avatar">
            <i className="fas fa-user"></i>
          </div>
          <div className="user-details">
            <p>Chargement des informations utilisateur...</p>
          </div>
        </div>
      </div>
    );
  }

  // Get initials from name
  const getInitials = () => {
    if (!userData.firstName || !userData.lastName) return '?';
    return `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`.toUpperCase();
  };
  // Ne pas afficher le profil de l'administrateur système
  if (userData.email === 'admin@bimrecovery.com') {
    return null;
  }

  return (
    <div className="user-profile">
      <div className="user-info">
        <div className="user-avatar">
          {userData.profilePicture ? (
            <img src={userData.profilePicture} alt="Profile" />
          ) : (
            <div className="initials-avatar">{getInitials()}</div>
          )}
        </div>        <div className="user-details">
          <h3>{userData.firstName} {userData.lastName}</h3>
          <p className="user-email">{userData.email}</p>
          <div className="user-roles">
            {roles && roles.length > 0 ? (
              roles.map((role, index) => (
                <span 
                  key={index}
                  className={`role-badge ${role.toLowerCase() === 'admin' ? 'admin-role' : ''}`}
                >
                  {role}
                </span>
              ))
            ) : (
              <span className="role-badge">User</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
