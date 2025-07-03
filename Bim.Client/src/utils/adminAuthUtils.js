// This script helps manage token authorization for admin requests

import { parseJwt, setAuthToken, getStoredToken } from '../services/authService';
import api from '../config/api.config';
import axios from 'axios';

// Check token for admin role
export const verifyAdminRole = (token) => {
  try {
    if (!token) return false;
    
    const tokenPayload = parseJwt(token);
    if (!tokenPayload) return false;
    
    // Extract all potential roles from various locations in the token
    const roles = [];
    
    // Check role property (string or array)
    if (tokenPayload.role) {
      if (Array.isArray(tokenPayload.role)) {
        roles.push(...tokenPayload.role);
      } else {
        roles.push(tokenPayload.role);
      }
    }
    
    // Check roles array
    if (Array.isArray(tokenPayload.roles)) {
      roles.push(...tokenPayload.roles);
    }
    
    // Check Microsoft identity claims format
    if (tokenPayload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']) {
      const msRoles = tokenPayload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      if (Array.isArray(msRoles)) {
        roles.push(...msRoles);
      } else {
        roles.push(msRoles);
      }
    }
    
    // Check if any role matches 'admin' (case insensitive)
    return roles.some(role => typeof role === 'string' && role.toLowerCase() === 'admin');
  } catch (error) {
    console.error('Error verifying admin role:', error);
    return false;
  }
};

// Ensure token is properly set for API requests
export const ensureTokenAuthorization = () => {
  const token = getStoredToken();
  
  if (!token) {
    console.warn('No authorization token found');
    return false;
  }
  
  // Ensure correct format for token
  const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  
  // Set token in API clients
  api.defaults.headers.common['Authorization'] = formattedToken;
  axios.defaults.headers.common['Authorization'] = formattedToken;
  
  return true;
};

// Test admin authorization 
export const testAdminAccess = async (endpoint = '/api/auth/verify') => {
  try {
    ensureTokenAuthorization();
    
    const response = await api.get(endpoint);
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    };
  }
};

// Quick fix for admin auth issues
export const repairAdminAuthorization = () => {
  const token = getStoredToken();
  
  if (!token) {
    console.warn('Cannot repair admin authorization - no token found');
    return false;
  }
  
  // 1. Parse and validate the token
  const parsedToken = parseJwt(token);
  if (!parsedToken) {
    console.error('Invalid token format');
    return false;
  }
  
  // 2. Check if user has admin role
  const isAdmin = verifyAdminRole(token);
  
  // 3. Ensure token is properly stored and headers are set
  setAuthToken(token);
  
  return isAdmin;
};

export default {
  verifyAdminRole,
  ensureTokenAuthorization,
  testAdminAccess,
  repairAdminAuthorization
};
