import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { resetPassword, validateResetToken } from '../../services/authService';
import logoSame from '../../assets/12.png';
import './Login.css';
import './ForgotPassword.css';
import { toast } from 'react-hot-toast';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');
  
  const { token } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const verifyToken = async () => {
      try {
        setValidating(true);
        const result = await validateResetToken(token);
        if (result.valid) {
          setTokenValid(true);
        } else {
          setError('Ce lien de réinitialisation est invalide ou a expiré');
          toast.error('Lien de réinitialisation invalide ou expiré');
        }
      } catch (err) {
        console.error('Token validation error:', err);
        setError('Ce lien de réinitialisation est invalide ou a expiré');
        toast.error('Lien de réinitialisation invalide');
      } finally {
        setValidating(false);
      }
    };
    
    if (token) {
      verifyToken();
    } else {
      setValidating(false);
      setError('Lien de réinitialisation invalide');
    }
  }, [token]);
  
  const checkPasswordStrength = (password) => {
    if (password.length === 0) {
      setPasswordStrength('');
      return;
    }
    
    let strength = 0;
    
    // Vérification de la longueur
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Vérification des caractères spéciaux
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    if (strength <= 2) {
      setPasswordStrength('faible');
    } else if (strength <= 4) {
      setPasswordStrength('moyen');
    } else {
      setPasswordStrength('fort');
    }
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    checkPasswordStrength(newPassword);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    if (!/[A-Z]/.test(password)) {
      setError('Le mot de passe doit contenir au moins une lettre majuscule');
      return;
    }
    
    if (!/[a-z]/.test(password)) {
      setError('Le mot de passe doit contenir au moins une lettre minuscule');
      return;
    }
    
    if (!/[0-9]/.test(password)) {
      setError('Le mot de passe doit contenir au moins un chiffre');
      return;
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError('Le mot de passe doit contenir au moins un caractère spécial');
      return;
    }
    
    setLoading(true);
    
    try {
      await resetPassword(token, password);
      setSubmitted(true);
      toast.success("Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.");
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || 'Une erreur s\'est produite lors de la réinitialisation du mot de passe');
      toast.error('Échec de la réinitialisation du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="login-container">
        <div className="background-overlay" />
        <div className="forgot-password-content">
          <div className="login-card forgot-password-card">
            <div className="login-header">
              <img src={logoSame} alt="Smart BIM Logo" className="login-form-logo" />
              <h1>Réinitialisation du mot de passe</h1>
              <p>Validation du lien en cours...</p>
            </div>
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="login-container">
      <div className="background-overlay" />
      
      <div className="forgot-password-content">
        <div className="login-card forgot-password-card">
          <div className="login-header">
            <img src={logoSame} alt="Smart BIM Logo" className="login-form-logo" />
            <h1>Réinitialisation du mot de passe</h1>
            {!submitted ? (
              tokenValid ? (
                <p>Entrez votre nouveau mot de passe</p>
              ) : (
                <p className="error-message">
                  {error || 'Lien de réinitialisation invalide ou expiré'}
                </p>
              )
            ) : (
              <p className="success-message">
                Votre mot de passe a été réinitialisé avec succès. Vous allez être redirigé vers la page de connexion.
              </p>
            )}
          </div>
          
          {!submitted && tokenValid ? (
            <form className="login-form" onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label htmlFor="password">
                  <i className="fas fa-lock"></i>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Nouveau mot de passe"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  autoComplete="new-password"
                />
                {password.length > 0 && (
                  <button
                    type="button"
                    className="password-toggle-icon"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                )}
              </div>
              
              {password.length > 0 && (
                <div className={`password-strength ${passwordStrength}`}>
                  <div className="strength-bar"></div>
                  <div className="strength-bar"></div>
                  <div className="strength-bar"></div>
                  <span>Force: {passwordStrength}</span>
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="confirmPassword">
                  <i className="fas fa-lock"></i>
                </label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                {confirmPassword.length > 0 && (
                  <button
                    type="button"
                    className="password-toggle-icon"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex="-1"
                  >
                    <i className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                )}
              </div>
              
              <div className="password-requirements">
                <p>Le mot de passe doit contenir :</p>
                <ul>
                  <li className={password.length >= 8 ? 'valid' : ''}>Au moins 8 caractères</li>
                  <li className={/[A-Z]/.test(password) ? 'valid' : ''}>Au moins une lettre majuscule</li>
                  <li className={/[a-z]/.test(password) ? 'valid' : ''}>Au moins une lettre minuscule</li>
                  <li className={/[0-9]/.test(password) ? 'valid' : ''}>Au moins un chiffre</li>
                  <li className={/[^A-Za-z0-9]/.test(password) ? 'valid' : ''}>Au moins un caractère spécial</li>
                </ul>
              </div>
              
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Réinitialisation en cours...' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          ) : (
            <div className="form-links">
              <button 
                type="button" 
                onClick={() => navigate('/login', { replace: true })} 
                className="back-to-login"
              >
                <i className="fas fa-arrow-left"></i> Retour à la connexion
              </button>
            </div>
          )}
          
          <div className="login-footer">
            <p>&copy; {new Date().getFullYear()} Smart BIM. Tous droits réservés.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
