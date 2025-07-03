// Admin authorization fix script for BIM Recovery
// This script ensures admin permissions work correctly

import { getStoredToken, parseJwt, setAuthToken } from '../services/authService';

/**
 * Function to repair admin role detection issues
 * This can be called from anywhere in the app
 */
const fixAdminAuthorization = () => {
  try {
    // Step 1: Check for token existence
    console.log('▶️ Running admin authorization fix script...');
    const token = getStoredToken();
    
    if (!token) {
      console.warn('⚠️ No authentication token found');
      return { success: false, message: 'No token found' };
    }
    
    // Step 2: Parse the token
    const payload = parseJwt(token);
    if (!payload) {
      console.error('❌ Invalid token format');
      return { success: false, message: 'Invalid token format' };
    }
    
    // Step 3: Extract roles from all possible sources
    const roles = new Set();
    let isAdmin = false;
    
    // Check standard role property
    if (payload.role) {
      if (Array.isArray(payload.role)) {
        payload.role.forEach(r => roles.add(r));
      } else {
        roles.add(payload.role);
      }
    }
    
    // Check roles array
    if (Array.isArray(payload.roles)) {
      payload.roles.forEach(r => roles.add(r));
    }
    
    // Check Microsoft identity claims format
    const msRoleKey = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
    if (payload[msRoleKey]) {
      if (Array.isArray(payload[msRoleKey])) {
        payload[msRoleKey].forEach(r => roles.add(r));
      } else {
        roles.add(payload[msRoleKey]);
      }
    }
    
    // Check for admin role case-insensitively
    const allRoles = Array.from(roles);
    isAdmin = allRoles.some(role => 
      typeof role === 'string' && role.toLowerCase() === 'admin'
    );
    
    // Step 4: Set up API client with proper authorization
    const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    setAuthToken(tokenValue);
    
    // Store admin status for access by other components
    localStorage.setItem('isAdminRole', isAdmin ? 'true' : 'false');
    
    // Log repair status
    console.log('✅ Admin authorization check completed:', {
      success: true,
      isAdmin,
      roles: allRoles,
      tokenActive: true
    });
    
    return { 
      success: true, 
      isAdmin, 
      roles: allRoles,
      message: isAdmin ? 'Admin role detected' : 'No admin role found'
    };
  } catch (error) {
    console.error('❌ Error fixing admin authorization:', error);
    return { 
      success: false, 
      message: `Error: ${error.message}` 
    };
  }
};

export { fixAdminAuthorization };
export default fixAdminAuthorization;
