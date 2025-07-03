// This is a utility script to debug JWT token issues in API requests
import { parseJwt, getStoredToken, isTokenValid } from '../services/authService';
import api from '../config/api.config';
import axios from 'axios';

// Log current auth state
const logTokenDebugInfo = () => {
  const token = getStoredToken();
  
  console.group('🔑 Auth Token Debug Info');
  console.log('Token exists:', !!token);
    if (token) {
    try {
      console.log('Token format valid:', token.startsWith('Bearer '));
      console.log('Token valid according to local validation:', isTokenValid(token));
      
      const parsed = parseJwt(token);
      console.log('Parsed token:', parsed);
      
      if (parsed) {
        console.log('Expiration time:', parsed.exp ? new Date(parsed.exp * 1000).toLocaleString() : 'Not found');
        console.log('User claims:', {
          sub: parsed.sub,
          name: parsed.name,
        });
        
        // Extract all potential role claims
        const roles = [];
        if (parsed.role) roles.push(...(Array.isArray(parsed.role) ? parsed.role : [parsed.role]));
        if (parsed.roles) roles.push(...(Array.isArray(parsed.roles) ? parsed.roles : [parsed.roles]));
        if (parsed['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']) {
          const rolesClaim = parsed['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
          roles.push(...(Array.isArray(rolesClaim) ? rolesClaim : [rolesClaim]));
        }
        
        console.log('All extracted roles:', roles);
        console.log('Has admin role:', roles.some(r => typeof r === 'string' && r.toLowerCase() === 'admin'));
      }
    } catch (error) {
      console.error('Failed to parse token:', error);
    }
  }
  
  console.log('API client auth header configured:', !!api.defaults.headers.common['Authorization']);
  console.log('Axios client auth header configured:', !!axios.defaults.headers.common['Authorization']);
  console.groupEnd();
};

// Export utils
export const tokenDebugUtils = {
  logTokenDebugInfo,
  testAuthApiCall: async (endpoint = '/api/auth/verify') => {
    try {
      console.group('🔌 API Auth Test');
      console.log('Calling endpoint:', endpoint);
      logTokenDebugInfo();
      
      const response = await api.get(endpoint);
      console.log('API Response:', response.data);
      console.log('Success! API call authenticated properly');
      console.groupEnd();
      return { success: true, data: response.data };
    } catch (error) {
      console.error('API call failed:', error);
      console.log('Response details:', error.response?.data);
      console.groupEnd();
      return { 
        success: false, 
        status: error.response?.status, 
        message: error.response?.data?.message || error.message 
      };
    }
  }
};

export default tokenDebugUtils;
