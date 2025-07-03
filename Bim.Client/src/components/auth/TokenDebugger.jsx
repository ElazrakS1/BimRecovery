import React, { useState } from 'react';
import { getStoredToken } from '../../services/authService';
import api from '../../config/api.config';
import { tokenDebugUtils } from '../../utils/tokenDebugUtils';

const TokenDebugger = () => {
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [tokenDetails, setTokenDetails] = useState(null);
  
  // Helper function to parse JWT token
  const parseJwt = (token) => {
    try {
      // Enlever le préfixe Bearer si présent
      const actualToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
      
      const base64Url = actualToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Erreur de parsing JWT:', error);
      return null;
    }
  };

  const checkToken = () => {
    const token = getStoredToken();
    if (!token) {
      setTokenDetails({ error: 'No token found in storage' });
      return;
    }

    try {
      // Clean token and analyze it
      const actualToken = token.startsWith('Bearer ') ? token.substring(7) : token;
      const decoded = parseJwt(token);
      
      setTokenDetails({
        token: `${actualToken.substring(0, 10)}...${actualToken.substring(actualToken.length - 10)}`, 
        decoded,
        roles: decoded?.roles || [],
        expiration: decoded?.exp ? new Date(decoded.exp * 1000).toLocaleString() : 'Unknown',
        isAdmin: decoded?.roles?.some(r => 
          typeof r === 'string' && r.toLowerCase() === 'admin'
        ),
        storageType: localStorage.getItem('token') ? 'localStorage' : 'sessionStorage'
      });
    } catch (error) {
      setTokenDetails({ error: `Failed to parse token: ${error.message}` });
    }
  };
  
  const toggleDebug = () => {
    if (!showDebugInfo) {
      checkToken();
    }
    setShowDebugInfo(!showDebugInfo);
  };
    const sendTestRequest = async () => {
    try {
      // Use the api service to ensure consistent header handling
      const response = await api.get('/api/auth/verify');
      
      alert(`API Test Result: ${response.status} - ${response.data.message || JSON.stringify(response.data)}`);
    } catch (error) {
      const errorMessage = error.response ? 
        `Status: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}` : 
        error.message;
      
      alert(`API Test Failed: ${errorMessage}`);
    }
  };

  return (
    <div className="token-debugger" style={{ marginTop: '10px', padding: '10px' }}>
      <button 
        onClick={toggleDebug}
        style={{ 
          background: '#007bff', 
          color: 'white', 
          border: 'none', 
          padding: '5px 10px',
          borderRadius: '4px'
        }}
      >
        {showDebugInfo ? 'Hide' : 'Debug'} Token Info
      </button>
      
      {showDebugInfo && tokenDetails && (      <div style={{ 
          marginTop: '10px', 
          padding: '15px', 
          background: '#f8f9fa', 
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          {tokenDetails.error ? (
            <div style={{ color: 'red' }}>{tokenDetails.error}</div>
          ) : (
            <>
              <h4 style={{ margin: '0 0 10px 0' }}>Token Information</h4>
              <div><strong>Stored in:</strong> {tokenDetails.storageType}</div>
              <div><strong>Expires:</strong> {tokenDetails.expiration}</div>
              <div><strong>Admin Role:</strong> {tokenDetails.isAdmin ? 'Yes' : 'No'}</div>
              <div><strong>Roles:</strong> {tokenDetails.roles.join(', ') || 'None'}</div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                <button 
                  onClick={sendTestRequest}
                  style={{ 
                    background: '#28a745', 
                    color: 'white', 
                    border: 'none', 
                    padding: '5px 10px',
                    borderRadius: '4px'
                  }}
                >
                  Test API Request
                </button>
                <button 
                  onClick={() => {
                    tokenDebugUtils.logTokenDebugInfo();
                    tokenDebugUtils.testAuthApiCall().then(result => {
                      if (result.success) {
                        alert('API verification successful! Check console for details.');
                      } else {
                        alert(`API verification failed: ${result.message}`);
                      }
                    });
                  }}
                  style={{ 
                    background: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    padding: '5px 10px',
                    borderRadius: '4px'
                  }}
                >
                  Advanced Test
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenDebugger;
