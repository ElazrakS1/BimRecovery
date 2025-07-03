import React, { useState, useEffect } from 'react';
import useUserValidation from '../../hooks/useUserValidation';
import './UserValidationAlert.css';

/**
 * Composant d'alerte pour la validation des utilisateurs
 * Affiche les erreurs de validation et les suggestions
 */
const UserValidationAlert = ({ 
  userIds = [], 
  onValidationChange,
  showSuggestions = true,
  autoValidate = true,
  className = ''
}) => {
  const { 
    validateUsers, 
    getValidationSuggestions,
    lastValidation,
    loading
  } = useUserValidation();
  
  const [validationResult, setValidationResult] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // Validation automatique quand les userIds changent
  useEffect(() => {
    if (autoValidate && userIds.length > 0) {
      handleValidation();
    } else if (userIds.length === 0) {
      // Réinitialiser quand la liste est vide
      setValidationResult(null);
      setSuggestions([]);
      if (onValidationChange) {
        onValidationChange({ isValid: true, validUserIds: [], invalidUserIds: [] });
      }
    }
  }, [userIds, autoValidate]);

  const handleValidation = async () => {
    try {
      const result = await validateUsers(userIds);
      setValidationResult(result);
      
      if (!result.isValid && showSuggestions) {
        const suggestionsList = getValidationSuggestions(result);
        setSuggestions(suggestionsList);
      } else {
        setSuggestions([]);
      }
      
      if (onValidationChange) {
        onValidationChange(result);
      }
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
    }
  };

  // Ne pas afficher si pas d'erreur
  if (!validationResult || validationResult.isValid) {
    return null;
  }

  return (
    <div className={`user-validation-alert ${className}`}>
      <div className="validation-alert error">
        <div className="alert-header">
          <i className="fas fa-exclamation-triangle"></i>
          <h4>Problème d'assignation d'utilisateur</h4>
        </div>
        
        <div className="alert-content">
          {validationResult.errorMessages.map((message, index) => (
            <p key={index} className="error-message">
              {message}
            </p>
          ))}
          
          {validationResult.hasInvalidUsers && (
            <div className="invalid-users">
              <strong>Utilisateurs non trouvés:</strong>
              <ul>
                {validationResult.invalidUserIds.map(userId => (
                  <li key={userId} className="invalid-user">
                    <code>{userId}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {validationResult.hasValidUsers && (
            <div className="valid-users">
              <strong>Utilisateurs valides ({validationResult.validUserIds.length}):</strong>
              <ul className="valid-users-list">
                {validationResult.validUserIds.map(userId => {
                  const userDetails = validationResult.userDetails[userId];
                  return (
                    <li key={userId} className="valid-user">
                      <i className="fas fa-check"></i>
                      <span>{userDetails ? userDetails.fullName || userDetails.email : userId}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions">
              <strong>Suggestions:</strong>
              <ul className="suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="suggestion">
                    <i className="fas fa-lightbulb"></i>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Composant de validation inline pour un champ de sélection d'utilisateur
 */
export const UserFieldValidation = ({ 
  userId, 
  onValidationChange,
  showDetails = true,
  className = ''
}) => {
  const { isUserValid, getUserDetails } = useUserValidation();
  const [isValid, setIsValid] = useState(true);
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    if (userId) {
      validateUser();
    }
  }, [userId]);

  const validateUser = async () => {
    try {
      const valid = await isUserValid(userId);
      const details = getUserDetails(userId);
      
      setIsValid(valid);
      setUserDetails(details);
      
      if (onValidationChange) {
        onValidationChange({ isValid: valid, userDetails: details });
      }
    } catch (error) {
      console.error('Erreur lors de la validation de l\'utilisateur:', error);
      setIsValid(false);
      setUserDetails(null);
    }
  };

  if (!userId || isValid) {
    return null;
  }

  return (
    <div className={`user-field-validation ${className}`}>
      <div className="validation-message error">
        <i className="fas fa-exclamation-circle"></i>
        <span>Utilisateur non trouvé ou inactif</span>
        {showDetails && userDetails && (
          <div className="user-details">
            <small>{userDetails.fullName} ({userDetails.email})</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserValidationAlert;
