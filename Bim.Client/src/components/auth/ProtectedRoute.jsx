import { Navigate, useLocation } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import useAdminAuth from '../../hooks/useAdminAuth';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, userData, checkAuth } = useContext(AuthContext);
  const { isAdmin, loading: adminLoading, source: adminSource } = useAdminAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        console.log("ProtectedRoute: Vérification de l'authentification");
        await checkAuth();
      } catch (err) {
        console.error("Erreur lors de la vérification d'authentification:", err);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAuth();
  }, [checkAuth]);

  if (isVerifying || adminLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 2s linear infinite', margin: 'auto' }}></div>
          </div>
          <p>Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (adminOnly) {
    // Use our improved admin detection from useAdminAuth hook
    console.log('ProtectedRoute: Vérification accès administrateur', {
      isAdmin,
      adminSource,
      userData
    });

    if (!isAdmin) {
      console.warn('Access denied: Admin privileges required');
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;