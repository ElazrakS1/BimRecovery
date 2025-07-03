import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getStoredToken, parseJwt } from '../services/authService';

/**
 * Custom hook to validate and provide admin authentication status
 * This hook ensures admin status is checked from multiple sources
 * to prevent unauthorized access issues
 */
const useAdminAuth = () => {
  const { userData, isAdmin: contextIsAdmin } = useContext(AuthContext);
  const [adminStatus, setAdminStatus] = useState({
    isAdmin: false,
    loading: true,
    roles: [],
    source: null
  });

  useEffect(() => {
    const checkAdminStatus = () => {
      try {
        // Sources to check for admin status
        let isAdmin = false;
        let roles = [];
        let source = 'none';

        // 1. Check context first - fastest source
        if (contextIsAdmin === true) {
          isAdmin = true;
          source = 'context';
        }

        // 2. Check user data object
        if (!isAdmin && userData) {
          // Check isAdmin property
          if (userData.isAdmin === true) {
            isAdmin = true;
            source = 'userData.isAdmin';
          }

          // Check roles array in userData
          if (!isAdmin && userData.roles && Array.isArray(userData.roles)) {
            roles = [...userData.roles];
            if (userData.roles.some(r => typeof r === 'string' && r.toLowerCase() === 'admin')) {
              isAdmin = true;
              source = 'userData.roles';
            }
          }
        }

        // 3. Check token directly if still not admin
        if (!isAdmin) {
          const token = getStoredToken();
          if (token) {
            const payload = parseJwt(token);
            if (payload) {
              // Extract roles from token
              const tokenRoles = [];
              
              // Check standard role property
              if (payload.role) {
                if (Array.isArray(payload.role)) {
                  roles.push(...payload.role);
                  tokenRoles.push(...payload.role);
                } else {
                  roles.push(payload.role);
                  tokenRoles.push(payload.role);
                }
              }
              
              // Check roles array
              if (Array.isArray(payload.roles)) {
                roles.push(...payload.roles);
                tokenRoles.push(...payload.roles);
              }
              
              // Check Microsoft identity claims format
              const msRoleKey = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
              if (payload[msRoleKey]) {
                if (Array.isArray(payload[msRoleKey])) {
                  roles.push(...payload[msRoleKey]);
                  tokenRoles.push(...payload[msRoleKey]);
                } else {
                  roles.push(payload[msRoleKey]);
                  tokenRoles.push(payload[msRoleKey]);
                }
              }
              
              // Check if any token role is admin
              if (tokenRoles.some(r => typeof r === 'string' && r.toLowerCase() === 'admin')) {
                isAdmin = true;
                source = 'token';
              }
            }
          }
        }

        // 4. Check localStorage flag (set by adminAuthManager)
        if (!isAdmin && localStorage.getItem('isAdminRole') === 'true') {
          isAdmin = true;
          source = 'localStorage';
        }

        // Update state with our findings
        setAdminStatus({
          isAdmin,
          loading: false,
          roles: [...new Set(roles)], // Remove duplicates
          source
        });
        
      } catch (error) {
        console.error('Error checking admin status:', error);
        setAdminStatus({
          isAdmin: false,
          loading: false,
          roles: [],
          source: 'error'
        });
      }
    };

    // Run check on mount and when dependencies change
    checkAdminStatus();
    
    // Re-run whenever admin auth manager is updated
    const handleStorageChange = (event) => {
      if (event.key === 'isAdminRole') {
        checkAdminStatus();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
    
  }, [userData, contextIsAdmin]);

  return adminStatus;
};

export default useAdminAuth;
