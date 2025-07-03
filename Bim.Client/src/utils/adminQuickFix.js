/**
 * Quick-fix script for BIM Recovery admin authorization issues
 * Run this script with:
 * import { applyAdminFix } from './utils/adminQuickFix'
 * applyAdminFix()
 */

import api from '../config/api.config';
import { getStoredToken, parseJwt } from '../services/authService';

/**
 * Applies all fixes for admin authorization
 * Returns a promise that resolves when all fixes are applied
 */
export const applyAdminFix = async () => {
  console.group('🔧 Admin Quick Fix');
  console.log('📋 Starting admin authorization repairs...');
  
  try {
    // Step 1: Check token existence
    const token = getStoredToken();
    if (!token) {
      console.error('❌ No authentication token found. Please login first.');
      console.groupEnd();
      return {
        success: false,
        error: 'No authentication token found'
      };
    }

    // Step 2: Parse and validate token
    console.log('🔍 Validating token...');
    const tokenPayload = parseJwt(token);
    if (!tokenPayload) {
      console.error('❌ Invalid token format. Please login again.');
      console.groupEnd();
      return {
        success: false,
        error: 'Invalid token format'
      };
    }

    if (tokenPayload.exp && tokenPayload.exp * 1000 < Date.now()) {
      console.error('❌ Token expired. Please login again.');
      console.groupEnd();
      return {
        success: false, 
        error: 'Token expired'
      };
    }
    
    // Step 3: Extract roles and admin status
    console.log('🔍 Checking for admin role...');
    const roles = extractRoles(tokenPayload);
    const isAdmin = roles.some(role => typeof role === 'string' && role.toLowerCase() === 'admin');
    
    // Step 4: Set up API client auth headers
    console.log('🔧 Setting up API authorization...');
    const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    api.defaults.headers.common['Authorization'] = tokenValue;
    
    // Step 5: Set localStorage admin flag
    localStorage.setItem('isAdminRole', isAdmin ? 'true' : 'false');
    
    // Step 6: Verify API works by making a test request
    console.log('🧪 Testing API connection...');
    try {
      const testResponse = await api.get('/api/Auth/verify');
      console.log('✅ API test successful:', testResponse.status);
    } catch (apiError) {
      console.warn('⚠️ API test failed:', apiError.message);
      // Continue anyway, this is just a test
    }
    
    // Final report
    console.log('✅ Admin authorization repair completed');
    console.log('📊 Results:', {
      isAdmin,
      roles,
      authHeaderSet: !!api.defaults.headers.common['Authorization'],
      localStorageFlagSet: localStorage.getItem('isAdminRole') === 'true'
    });
    
    console.groupEnd();
    return {
      success: true,
      isAdmin,
      roles,
      message: isAdmin ? 'Admin role detected and fixes applied' : 'Fixes applied, but no admin role detected'
    };
    
  } catch (error) {
    console.error('❌ Error during repair:', error);
    console.groupEnd();
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Extracts all possible roles from a token payload
 */
const extractRoles = (payload) => {
  const roles = new Set();
  
  // Check standard role property
  if (payload.role) {
    if (Array.isArray(payload.role)) {
      payload.role.forEach(r => roles.add(String(r)));
    } else {
      roles.add(String(payload.role));
    }
  }
  
  // Check roles array
  if (Array.isArray(payload.roles)) {
    payload.roles.forEach(r => roles.add(String(r)));
  }
  
  // Check Microsoft identity claims format
  const msRoleKey = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
  if (payload[msRoleKey]) {
    if (Array.isArray(payload[msRoleKey])) {
      payload[msRoleKey].forEach(r => roles.add(String(r)));
    } else {
      roles.add(String(payload[msRoleKey]));
    }
  }
  
  return Array.from(roles);
};

export default applyAdminFix;
