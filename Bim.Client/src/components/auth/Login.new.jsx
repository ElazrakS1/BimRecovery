import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api.config';
import logoSame from '../../assets/12.png';
import { login as authLogin } from '../../services/authService';
import './Login.css';

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
  const [success, setSuccess] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { setIsAuthenticated, checkAuth } = useContext(AuthContext);
  const navigate = useNavigate();

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
      console.log('Login response received:', data);

      if (!data || !data.token) {
        throw new Error('No token received from server');
      }

      // Store token based on user preference
      const storage = rememberMe ? localStorage : sessionStorage;
      const otherStorage = rememberMe ? sessionStorage : localStorage;
      
      storage.setItem('token', data.token);
      otherStorage.removeItem('token');
      
      console.log(`Token stored in ${rememberMe ? 'localStorage' : 'sessionStorage'}`);

      // Set authentication state and verify
      setIsAuthenticated(true);
      const isValid = await checkAuth();

      if (isValid) {
        console.log('Authentication verified successfully');
        setSuccess(true);
        navigate('/viewer');
      } else {
        throw new Error('Failed to verify authentication');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Une erreur est survenue lors de la connexion');
      setIsAuthenticated(false);
      
      // Clear any tokens that might have been set
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const renderFloatingElements = () => {
    return (
      <div className="floating-elements">
        {/* Add some floating decorative elements */}
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>
    );
  };

  return (
    <div className="login-page">
      <div className="login-background" style={{
        backgroundImage: `url(${backgroundImages[currentImageIndex]})`
      }}>
        {renderFloatingElements()}
      </div>
      
      <div className="login-container">
        <div className="login-box">
          <div className="login-header">
            <img src={logoSame} alt="SmartBIM Logo" className="login-logo" />
            <h2>Connexion à SmartBIM</h2>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="form-input"
              />
            </div>

            <div className="form-group password-group">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                required
                className="form-input"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="password-toggle"
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>

            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="form-checkbox"
              />
              <label htmlFor="rememberMe">Se souvenir de moi</label>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">Connexion réussie!</div>}

            <button 
              type="submit" 
              className={`login-button ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
