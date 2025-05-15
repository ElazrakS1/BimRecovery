import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api.config';
import logoSame from '../../assets/logosame.png';
import './Login.css';

const backgroundImages = [
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=2070', // Bureau d'architecte moderne
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2070', // Building moderne
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=2070', // Chantier professionnel
  'https://plus.unsplash.com/premium_photo-1661964088064-dd92eaaa7dcf?auto=format&fit=crop&q=80&w=2070', // 3D BIM
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { setIsAuthenticated, checkAuth, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const renderFloatingElements = () => {
    const elements = [];
    const shapes = [
      'M0,0 L30,0 L30,30 L0,30Z', // Carré
      'M15,0 L30,30 L0,30Z',      // Triangle
      'M0,15 L30,0 L30,30 L0,30Z' // Trapèze
    ];

    for (let i = 0; i < 15; i++) {
      const style = {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        transform: `scale(${0.5 + Math.random()})`,
        animationDelay: `${Math.random() * 5}s`,
      };

      elements.push(
        <div key={i} className="floating-element" style={style}>
          <svg width="30" height="30" viewBox="0 0 30 30">
            <path 
              d={shapes[i % shapes.length]} 
              fill="none"
              stroke="rgba(52, 152, 219, 0.2)"
              strokeWidth="1"
            />
          </svg>
        </div>
      );
    }
    return elements;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: email,
          password: password 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur de connexion');
      }
      
      // Store the token in the appropriate storage
      if (rememberMe) {
        localStorage.setItem('token', data.token);
      } else {
        sessionStorage.setItem('token', data.token);
      }
      
      // Set authentication state directly here
      setIsAuthenticated(true);
      setSuccess(true);
      
      // Then navigate after a brief delay to show success message
      setTimeout(() => {
        navigate('/viewer');
      }, 1000);
      
      // Call checkAuth() to load user data in the background
      // but don't wait for it or check its results for navigation
      checkAuth();
    } catch (error) {
      console.error('Erreur de connexion:', error);
      setError(error.message || 'Une erreur est survenue lors de la connexion');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="background-slideshow">
        {backgroundImages.map((image, index) => (
          <div
            key={index}
            className={`background-slide ${index === currentImageIndex ? 'active' : ''}`}
            style={{ backgroundImage: `url(${image})` }}
          />
        ))}
      </div>
      <div className="background-overlay" />

      <div className="floating-elements">
        {renderFloatingElements()}
      </div>
      
      <div className="login-content-wrapper">
        <div className="login-info-section">
          <div className="brand-section">
            <img src={logoSame} alt="Smart BIM Logo" className="brand-logo" />
            <h1 className="brand-name">Smart BIM</h1>
          </div>
          
          <div className="info-content">
            <h2>Plateforme de Gestion BIM</h2>
            <p className="platform-description">
              Une solution complète pour la modélisation des informations du bâtiment. 
              Gérez efficacement vos projets, modèles 3D et collaborez avec votre équipe en temps réel.
            </p>
            
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">
                  <i className="fas fa-project-diagram"></i>
                </div>
                <div className="feature-text">
                  <h3>Gestion de Projets</h3>
                  <p>Planifiez et suivez vos projets de construction avec une interface intuitive.</p>
                </div>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon">
                  <i className="fas fa-cubes"></i>
                </div>
                <div className="feature-text">
                  <h3>Visualisation de Modèles</h3>
                  <p>Visualisez et manipulez vos modèles BIM en 3D directement dans le navigateur.</p>
                </div>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="feature-text">
                  <h3>Collaboration d'Équipe</h3>
                  <p>Travaillez ensemble efficacement avec des outils de communication intégrés.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="info-footer">
            <p>Utilisé par des professionnels de la construction dans le monde entier</p>
          </div>
        </div>

        <div className="login-form-section">
          <div className="login-card">
            <div className="login-header">
              <img src={logoSame} alt="Smart BIM Logo" className="login-form-logo" />
              <h1>Bienvenue</h1>
              <p>Connectez-vous pour continuer</p>
            </div>
            
            <form className="login-form" onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">Connexion réussie ! Redirection...</div>}
              
              <div className="form-group">
                <label htmlFor="email">
                  <i className="fas fa-user"></i>
                </label>
                <input
                  type="email"
                  id="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">
                  <i className="fas fa-lock"></i>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
              
              <div className="form-options">
                <div className="remember-me">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="remember">Se souvenir de moi</label>
                </div>
                <a href="/forgot-password" className="forgot-password">
                  Mot de passe oublié ?
                </a>
              </div>
              
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
            
            <div className="login-footer">
              <p>&copy; {new Date().getFullYear()} Smart BIM. Tous droits réservés.</p>
              <p className="admin-note">Contactez l'administrateur pour créer un compte.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
