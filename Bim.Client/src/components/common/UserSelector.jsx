import React, { useState, useEffect, useRef } from 'react';
import useUserValidation from '../../hooks/useUserValidation';
import UserValidationAlert from './UserValidationAlert';
import './UserSelector.css';

/**
 * Composant de sélection d'utilisateurs avec validation intégrée
 */
const UserSelector = ({
  selectedUserIds = [],
  onSelectionChange,
  multiple = true,
  placeholder = "Sélectionner des utilisateurs...",
  showValidation = true,
  className = '',
  disabled = false,
  required = false,
  maxSelections = null
}) => {
  const {
    availableUsers,
    loading,
    formatUserForDropdown,
    filterUsers,
    validateUsers,
    loadAvailableUsers
  } = useUserValidation();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const dropdownRef = useRef(null);

  // Charger les utilisateurs au montage
  useEffect(() => {
    if (availableUsers.length === 0) {
      loadAvailableUsers();
    }
  }, [availableUsers.length, loadAvailableUsers]);

  // Filtrer les utilisateurs selon la recherche
  useEffect(() => {
    const filtered = filterUsers(searchTerm);
    setFilteredUsers(filtered);
  }, [searchTerm, availableUsers, filterUsers]);

  // Valider les utilisateurs sélectionnés
  useEffect(() => {
    if (showValidation && selectedUserIds.length > 0) {
      validateSelection();
    }
  }, [selectedUserIds, showValidation]);

  // Fermer le dropdown au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validateSelection = async () => {
    try {
      const result = await validateUsers(selectedUserIds);
      setValidationResult(result);
      return result;
    } catch (error) {
      console.error('Erreur de validation:', error);
      return null;
    }
  };

  // Afficher un style différent pour les utilisateurs invalides
  const getSelectedUserStyle = (userId) => {
    if (!validationResult || validationResult.isValid) return {};
    
    if (validationResult.invalidUserIds.includes(userId)) {
      return { 
        backgroundColor: 'rgba(231, 76, 60, 0.2)',
        borderColor: '#e74c3c',
        color: '#c0392b'
      };
    }
    
    return {};
  };

  const handleUserToggle = (userId) => {
    if (disabled) return;

    let newSelection;
    
    if (multiple) {
      if (selectedUserIds.includes(userId)) {
        // Retirer l'utilisateur
        newSelection = selectedUserIds.filter(id => id !== userId);
      } else {
        // Ajouter l'utilisateur (vérifier la limite)
        if (maxSelections && selectedUserIds.length >= maxSelections) {
          return; // Ne pas ajouter si limite atteinte
        }
        newSelection = [...selectedUserIds, userId];
      }
    } else {
      // Mode simple sélection
      newSelection = selectedUserIds.includes(userId) ? [] : [userId];
      setIsOpen(false); // Fermer après sélection en mode simple
    }

    if (onSelectionChange) {
      onSelectionChange(newSelection);
    }
  };

  const handleRemoveUser = (userId, event) => {
    event.stopPropagation();
    if (disabled) return;
    
    const newSelection = selectedUserIds.filter(id => id !== userId);
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    }
  };

  const getSelectedUserDetails = (userId) => {
    return availableUsers.find(user => user.id === userId);
  };

  const renderSelectedUsers = () => {
    if (selectedUserIds.length === 0) return null;

    return (
      <div className="selected-users">
        {selectedUserIds.map(userId => {
          const user = getSelectedUserDetails(userId);
          const isInvalid = validationResult && validationResult.invalidUserIds.includes(userId);
          
          return (
            <div 
              key={userId} 
              className={`selected-user ${isInvalid ? 'invalid' : 'valid'}`}
              style={getSelectedUserStyle(userId)}
            >
              <span className="user-info">
                {user ? formatUserForDropdown(user) : `Inconnu (${userId})`}
                {isInvalid && <i className="validation-icon fas fa-exclamation-circle" title="Utilisateur invalide"></i>}
              </span>
              {!disabled && (
                <button
                  type="button"
                  className="remove-user"
                  onClick={(e) => handleRemoveUser(userId, e)}
                  aria-label="Retirer l'utilisateur"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const getPlaceholderText = () => {
    if (loading) return 'Chargement des utilisateurs...';
    if (selectedUserIds.length > 0) {
      return multiple ? `${selectedUserIds.length} utilisateur(s) sélectionné(s)` : '';
    }
    return placeholder;
  };

  return (
    <div className={`user-selector ${className}`}>
      <div 
        ref={dropdownRef}
        className={`selector-container ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
      >
        {/* Zone de sélection principale */}
        <div 
          className="selector-input"
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <div className="input-content">
            {selectedUserIds.length > 0 ? renderSelectedUsers() : (
              <span className="placeholder">{getPlaceholderText()}</span>
            )}
          </div>
          <div className="selector-actions">
            {maxSelections && selectedUserIds.length > 0 && (
              <span className="selection-count">
                {selectedUserIds.length}/{maxSelections}
              </span>
            )}
            {!disabled && (
              <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} dropdown-arrow`}></i>
            )}
          </div>
        </div>

        {/* Dropdown des utilisateurs disponibles */}
        {isOpen && !disabled && (
          <div className="dropdown-menu">
            {/* Barre de recherche */}
            <div className="search-bar">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Rechercher des utilisateurs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                autoFocus
              />
            </div>

            {/* Liste des utilisateurs */}
            <div className="users-list">
              {loading ? (
                <div className="loading-state">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Chargement...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="empty-state">
                  <i className={searchTerm ? "fas fa-search" : "fas fa-exclamation-triangle"}></i>
                  <span>
                    {searchTerm 
                      ? 'Aucun utilisateur trouvé pour cette recherche' 
                      : 'Aucun utilisateur disponible'}
                  </span>
                  {!searchTerm && availableUsers.length === 0 && (
                    <button 
                      className="reload-users-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadAvailableUsers();
                      }}
                    >
                      <i className="fas fa-sync-alt"></i> Réessayer
                    </button>
                  )}
                </div>
              ) : (
                filteredUsers.map(user => {
                  const isSelected = selectedUserIds.includes(user.id);
                  const canSelect = !isSelected && (!maxSelections || selectedUserIds.length < maxSelections);
                  
                  return (
                    <div
                      key={user.id}
                      className={`user-option ${isSelected ? 'selected' : ''} ${!canSelect && !isSelected ? 'disabled' : ''}`}
                      onClick={() => (canSelect || isSelected) && handleUserToggle(user.id)}
                    >
                      <div className="user-checkbox">
                        {multiple ? (
                          <i className={`fas ${isSelected ? 'fa-check-square' : 'fa-square'}`}></i>
                        ) : (
                          <i className={`fas ${isSelected ? 'fa-dot-circle' : 'fa-circle'}`}></i>
                        )}
                      </div>
                      <div className="user-details">
                        <div className="user-name">
                          {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sans nom'}
                        </div>
                        <div className="user-meta">
                          {user.email && <span className="user-email">{user.email}</span>}
                          {user.company && <span className="user-company">{user.company}</span>}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="selected-indicator">
                          <i className="fas fa-check"></i>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Actions du dropdown */}
            <div className="dropdown-actions">
              <button
                type="button"
                className="btn-clear"
                onClick={() => onSelectionChange && onSelectionChange([])}
                disabled={selectedUserIds.length === 0}
              >
                <i className="fas fa-times"></i>
                Tout effacer
              </button>
              <button
                type="button"
                className="btn-refresh"
                onClick={loadAvailableUsers}
                disabled={loading}
              >
                <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i>
                Actualiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alerte de validation */}
      {showValidation && (
        <UserValidationAlert
          userIds={selectedUserIds}
          onValidationChange={setValidationResult}
          autoValidate={true}
        />
      )}

      {/* Informations supplémentaires */}
      <div className="selector-info">
        {required && selectedUserIds.length === 0 && (
          <span className="required-indicator">* Ce champ est requis</span>
        )}
        {maxSelections && (
          <span className="limit-indicator">
            Maximum {maxSelections} utilisateur(s)
          </span>
        )}
      </div>
    </div>
  );
};

export default UserSelector;
