import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { login as authLogin, storeToken } from '../../services/authService';
import logoSame from '../../assets/12.png';
import './Login.css';
import './LoginFormOptionsForce.css';

const backgroundImages = [
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=2070',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2070',
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=2070',
  'https://plus.unsplash.com/premium_photo-1661964088064-dd92eaaa7dcf?auto=format&fit=crop&q=80&w=2070',
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { setIsAuthenticated, checkAuth } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Nettoyage des tokens à l'arrivée sur la page de login
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setIsAuthenticated(false);
  }, [setIsAuthenticated]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      console.log('Attempting login...');
      const data = await authLogin(email, password);
      
      if (!data?.token) {
        throw new Error('No token received from server');
      }

      console.log('Login response:', {
        hasToken: true,
        user: {
          ...data.user,
          roles: data.user?.roles
        }
      });

      // Store token and update auth headers
      const stored = storeToken(data.token, rememberMe);
      if (!stored) {
        throw new Error('Failed to store authentication token');
      }
      
      // Attendre un moment pour que le token soit bien stocké
      await new Promise(resolve => setTimeout(resolve, 100));

      // Vérifier l'authentification et récupérer les données utilisateur
      const verified = await checkAuth();
      if (!verified) {
        throw new Error('Failed to verify authentication');
      }

      console.log('Authentication verified successfully');      // Determine redirect path based on role
      let redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
      
      // Clear stored redirect path
      sessionStorage.removeItem('redirectAfterLogin');

      // Vérification plus robuste du rôle administrateur
      const isAdmin = 
        data.user?.isAdmin === true || 
        data.user?.roles?.some(role => typeof role === 'string' && role.toLowerCase() === 'admin') ||
        data.user?.role === 'Admin';
        
      console.log('Vérification des droits admin après connexion:', { 
        isAdmin,
        userRoles: data.user?.roles,
        userRole: data.user?.role,
        userIsAdmin: data.user?.isAdmin
      });

      // Si l'utilisateur est admin et tentait d'accéder à une route admin, respecter cela
      if (isAdmin && location.state?.from && 
          (location.state.from.startsWith('/users') || 
           location.state.from.startsWith('/tasks/manage') ||
           location.state.from.startsWith('/analytics'))) {
        redirectPath = location.state.from;
      }

      console.log('Redirecting to:', redirectPath);
      navigate(redirectPath);
      
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Une erreur s\'est produite lors de la connexion');
      setIsAuthenticated(false);

      // Clear any partially stored data
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
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
                  autoComplete="username"
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
                  autoComplete="current-password"
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
              </div>                <div className="form-options">
                  <div className="remember-me">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <label htmlFor="remember">Se souvenir de moi</label>
                  </div>
                  <button 
                    type="button" 
                    className="forgot-password" 
                    onClick={() => navigate('/forgot-password', { replace: true })}
                  >
                    Mot de passe oublié ?
                  </button>
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