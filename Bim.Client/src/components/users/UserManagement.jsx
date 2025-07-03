import React, { useState, useEffect } from 'react';
import './UserManagement.css';
import { API_BASE_URL } from '../../config/api.config';
import api from '../../config/api.config';
import { userService } from '../../services/userService';
import { getStoredToken } from '../../services/authService';
import useAdminAuth from '../../hooks/useAdminAuth';

const UserManagement = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [editMode, setEditMode] = useState(false);  const [editUserId, setEditUserId] = useState(null);
  useAdminAuth(); // Ensure admin authentication is checked
  
  // État du formulaire
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    position: '',
    role: ''
  });

  // Réinitialiser les erreurs du formulaire lors de l'affichage
  useEffect(() => {
    if (showAddForm) {
      setFormErrors({});
      setError('');
    }
  }, [showAddForm]);

  // Réinitialiser l'état du formulaire lors de la fermeture
  useEffect(() => {
    if (!showAddForm) {
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        company: '',
        position: '',
        role: 'User'
      });
      setFormErrors({});
      setError('');
      setEditMode(false);
      setEditUserId(null);
    }
  }, [showAddForm]);
  
  // Charger les utilisateurs au montage du composant
  useEffect(() => {
    fetchUsersList();
  }, []);

  // Validation du formulaire
  const validateForm = () => {
    const errors = {};
    
    if (!newUser.firstName.trim()) {
      errors.firstName = "Le prénom est requis";
    } else if (newUser.firstName.length < 2) {
      errors.firstName = "Le prénom doit contenir au moins 2 caractères";
    }
    
    if (!newUser.lastName.trim()) {
      errors.lastName = "Le nom est requis";
    } else if (newUser.lastName.length < 2) {
      errors.lastName = "Le nom doit contenir au moins 2 caractères";
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!newUser.email.trim()) {
      errors.email = "L'email est requis";
    } else if (!emailRegex.test(newUser.email)) {
      errors.email = "Veuillez entrer une adresse email valide";
    }
    
    if (!editMode || (editMode && newUser.password)) {
      if (!newUser.password) {
        errors.password = "Le mot de passe est requis";
      } else if (newUser.password.length < 8) {
        errors.password = "Le mot de passe doit contenir au moins 8 caractères";
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(newUser.password)) {
        errors.password = "Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial";
      }
    }
    
    if (newUser.password !== newUser.confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    const validRoles = ['User', 'Admin', 'Manager'];
    if (!validRoles.includes(newUser.role)) {
      errors.role = "Le rôle spécifié est invalide";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
    
    setFormErrors(prev => ({
      ...prev,
      [name]: undefined
    }));
  };
  
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(''); 
    setFormErrors({});
    
    if (!validateForm()) {
      return;
    }
      try {
      setLoading(true);
      
      const userData = {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        company: newUser.company || "",
        position: newUser.position || "",
        role: newUser.role
      };

      if (!editMode || (editMode && newUser.password)) {
        userData.password = newUser.password;
      }
      
      // Using axios/api instance instead of fetch for consistent header handling
      const url = editMode 
        ? `/api/users/${editUserId}` 
        : `/api/auth/register`;
      
      console.log('Sending user data to:', url, {
        email: userData.email,
        role: userData.role,
        withAuthToken: !!getStoredToken()
      });
      
      const response = await userService.saveUser(url, userData, editMode); // The API service already handles response validation and error formatting
      // The response is directly from axios, not fetch, so we check differently
      if (!response || response.status >= 400) {
        const errorMessage = response?.data?.message || "Une erreur s'est produite";
        console.error("Backend error:", errorMessage);
        setError(errorMessage);
        return;
      }
      
      setSuccessMessage(editMode ? "Utilisateur modifié avec succès" : "Utilisateur créé avec succès");
      setTimeout(() => setSuccessMessage(''), 3000);

      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        company: '',
        position: '',
        role: 'User'
      });
      
      setShowAddForm(false);
      setEditMode(false);
      setEditUserId(null);
      fetchUsersList();
    } catch (err) {
      console.error("Erreur lors de l'opération :", err);
      setError(err.message || "Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };
  const fetchUsersList = async () => {
    try {
      setError('');
      // Utiliser la méthode spécifique pour l'administration des utilisateurs
      const userData = await userService.getAllUsersAdmin();
      
      // Normalize data to ensure consistent property names
      const normalizedUsers = userData.map(user => ({
        ...user,
        roles: user.roles || user.Roles || [] // Ensure we always have a roles array (lowercase)
      }));
      
      setUsers(normalizedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      if (err.message.includes('Unauthorized')) {
        setError("Vous n'avez pas les permissions nécessaires pour accéder à cette page. Seuls les administrateurs peuvent voir la liste des utilisateurs.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };
    const toggleUserStatus = async (userId, currentStatus) => {
    try {
      setError('');
      
      console.log('Toggling user status:', {
        userId,
        currentStatus,
        newStatus: !currentStatus
      });
      
      // Use API client for consistent header handling
      const response = await api.put(`/api/users/${userId}/status`, { isActive: !currentStatus });
      
      if (!response || response.status >= 400) {
        throw new Error(response?.data?.message || "Échec de la mise à jour du statut de l'utilisateur");
      }
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isActive: !currentStatus } : user
      ));
      
    } catch (err) {
      console.error('Erreur lors du changement de statut:', err);
      setError(err.message || "Une erreur s'est produite lors de la mise à jour du statut");
    }
  };
  const handleEditClick = (user) => {
    setNewUser({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      confirmPassword: '',
      company: user.company || '',
      position: user.position || '',
      role: user.roles && user.roles.length > 0 ? user.roles[0] : 'User'
    });
    setEditUserId(user.id);
    setEditMode(true);
    setShowAddForm(true);
  };

  const formTitle = editMode ? "Modifier l'utilisateur" : "Ajouter un utilisateur";
  const submitButtonText = editMode ? "Modifier" : "Créer utilisateur";

  return (
    <div className="user-management-main">
      {loading && !showAddForm ? (
        <div className="loader-container">
          <div className="loader"></div>
          <p>Chargement des utilisateurs...</p>
        </div>      ) : (
        <>
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}
          
          <div className="section-header">
            <h2>Utilisateurs</h2>
            <button
              className="btn-primary" 
              onClick={() => setShowAddForm(true)}
            >
              <i className="fas fa-user-plus"></i> Nouvel Utilisateur
            </button>
          </div>
          
          {showAddForm ? (
            <div className="user-form-container">
              <h3>{formTitle}</h3>
              <form onSubmit={handleCreateUser} className="user-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">
                      Prénom <span className="required-mark">*</span>
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      name="firstName"
                      value={newUser.firstName}
                      onChange={handleInputChange}
                      className={formErrors.firstName ? "error" : ""}
                      placeholder="Entrez le prénom de l'utilisateur"
                      required
                    />
                    {formErrors.firstName && <div className="field-error">{formErrors.firstName}</div>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">
                      Nom <span className="required-mark">*</span>
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      name="lastName"
                      value={newUser.lastName}
                      onChange={handleInputChange}
                      className={formErrors.lastName ? "error" : ""}
                      placeholder="Entrez le nom de famille"
                      required
                    />
                    {formErrors.lastName && <div className="field-error">{formErrors.lastName}</div>}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="email">
                    Email <span className="required-mark">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={newUser.email}
                    onChange={handleInputChange}
                    className={formErrors.email ? "error" : ""}
                    placeholder="exemple@domaine.com"
                    required
                  />
                  {formErrors.email && <div className="field-error">{formErrors.email}</div>}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="password">
                      Mot de passe {editMode ? "" : <span className="required-mark">*</span>}
                    </label>
                    <input
                      id="password"
                      type="password"
                      name="password"
                      value={newUser.password}
                      onChange={handleInputChange}
                      className={formErrors.password ? "error" : ""}
                      required={!editMode}
                    />
                    <small className="form-text text-muted">
                      Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial
                    </small>
                    {formErrors.password && <div className="field-error">{formErrors.password}</div>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirmPassword">
                      Confirmer mot de passe {editMode ? "" : <span className="required-mark">*</span>}
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      name="confirmPassword"
                      value={newUser.confirmPassword}
                      onChange={handleInputChange}
                      className={formErrors.confirmPassword ? "error" : ""}
                      required={!editMode}
                    />
                    {formErrors.confirmPassword && <div className="field-error">{formErrors.confirmPassword}</div>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="company">Entreprise</label>
                    <input
                      id="company"
                      type="text"
                      name="company"
                      value={newUser.company}
                      onChange={handleInputChange}
                      placeholder="Nom de l'entreprise"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="position">Fonction</label>
                    <input
                      id="position"
                      type="text"
                      name="position"
                      value={newUser.position}
                      onChange={handleInputChange}
                      placeholder="Poste occupé"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="role">Rôle</label>
                  <select 
                    id="role"
                    name="role" 
                    value={newUser.role} 
                    onChange={handleInputChange}
                  >
                    <option value="" disabled>Sélectionnez un rôle</option>
                    <option value="User">Utilisateur</option>
                    <option value="Admin">Administrateur</option>
                    <option value="Manager">Gestionnaire</option>
                  </select>
                </div>
                <div className="form-buttons">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormErrors({});
                      setError('');
                    }}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Traitement...' : submitButtonText}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Entreprise</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>{users.map(user => (
                <tr key={user.id}>
                  <td title={`${user.firstName} ${user.lastName}`}>{user.firstName} {user.lastName}</td>
                  <td title={user.email}>{user.email}</td>
                  <td title={user.company || '-'}>{user.company || '-'}</td>
                  <td>
                    {/* Debugging: afficher des informations détaillées sur les rôles */}
                    {console.log('User Details:', { 
                      email: user.email, 
                      originalRoles: user.Roles, 
                      normalizedRoles: user.roles, 
                      roleType: typeof user.roles, 
                      isArray: Array.isArray(user.roles) 
                    })}
                    <span className={`role-badge ${user.roles && user.roles[0] ? user.roles[0].toLowerCase() : 'user'}`}>
                      {user.roles && user.roles.length > 0 ? user.roles[0] : 'User'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-icon edit"
                        title="Modifier"
                        onClick={() => handleEditClick(user)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className={`btn-icon ${user.isActive ? 'deactivate' : 'activate'}`}
                        title={user.isActive ? 'Désactiver' : 'Activer'}
                        onClick={() => toggleUserStatus(user.id, user.isActive)}
                      >
                        <i className={`fas fa-${user.isActive ? 'user-slash' : 'user-check'}`}></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}              </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserManagement;