import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../../services/authService';
import logoSame from '../../assets/12.png';
import './Login.css';
import './ForgotPassword.css';
import { toast } from 'react-hot-toast';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Appel à l'API pour demander une réinitialisation de mot de passe
      const response = await requestPasswordReset(email);
      
      // Le serveur renvoie toujours un code 200 pour des raisons de sécurité
      // même si l'email n'existe pas
      setSubmitted(true);
      toast.success("Si l'email existe, des instructions de réinitialisation ont été envoyées.");
      
      // Log pour débogage (à supprimer en production)
      console.log('Password reset response:', response);
    } catch (err) {
      console.error('Password reset request error:', err);
      
      // Erreur réseau ou serveur uniquement, pas liée à l'existence de l'email
      setError('Une erreur de connexion s\'est produite. Veuillez réessayer plus tard.');
      toast.error('Erreur lors de la connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container forgot-password-page">
      {/* Background et effets visuels */}
      <div className="background-slideshow">
        <div className="background-slide active" style={{ backgroundColor: "#6356e5" }}></div>
      </div>
      
      {/* Contenu principal */}
      <div className="login-content-wrapper">
        <div className="forgot-password-content">
          <div className="login-card forgot-password-card">
            <div className="login-header">
              <img src={logoSame} alt="Smart BIM Logo" className="login-form-logo" />
              <h1>Mot de passe oublié</h1>
              {!submitted ? (
                <p>Entrez votre adresse email pour réinitialiser votre mot de passe</p>
              ) : (
                <p className="success-message">
                  Si l'adresse email fournie est associée à un compte, vous recevrez sous peu un email avec les instructions pour réinitialiser votre mot de passe.
                </p>
              )}
            </div>
            
            {!submitted ? (
              <form className="login-form" onSubmit={handleSubmit}>
                {error && <div className="error-message">{error}</div>}
                
                <div className="form-group">
                  <label htmlFor="email">
                    <i className="fas fa-envelope"></i>
                  </label>
                  <input
                    type="email"
                    id="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                
                <button type="submit" className="login-button" disabled={loading}>
                  {loading ? 'Envoi en cours...' : 'Réinitialiser le mot de passe'}
                </button>
                <div className="form-links">
                <button 
                  type="button" 
                  onClick={() => navigate('/login', { replace: true })} 
                  className="back-to-login"
                >
                  <i className="fas fa-arrow-left"></i> Retour à la connexion
                </button>
              </div>
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
    </div>
  );
};

export default ForgotPassword;
