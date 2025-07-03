// This file adds BIM Recovery's Admin authentication helper function
// It will restore admin role detection without requiring server changes

import { getStoredToken, parseJwt } from '../services/authService';
import api from '../config/api.config';

/**
 * Helper component to diagnose BIM Recovery admin permissions
 * This runs automatically when imported and attempts to repair admin auth issues
 */
class AdminAuthManager {
  constructor() {
    this.isInitialized = false;
    this.repairOnLoad();
    
    // Monitor session for token changes
    window.addEventListener('storage', (event) => {
      if (event.key === 'token' || event.key === null) {
        this.repairOnLoad();
      }
    });
  }
  
  /**
   * Repair admin authorization issues on login/page load
   */
  repairOnLoad() {
    try {
      const token = getStoredToken();
      if (!token) return false;
      
      // Try to extract admin role from token
      const payload = parseJwt(token);
      if (!payload) return false;
      
      // Create roles collection from all possible sources
      const roles = new Set();
      
      // Check standard role property (can be string or array)
      if (payload.role) {
        if (Array.isArray(payload.role)) {
          payload.role.forEach(r => roles.add(typeof r === 'string' ? r : String(r)));
        } else {
          roles.add(String(payload.role));
        }
      }
      
      // Check roles array
      if (Array.isArray(payload.roles)) {
        payload.roles.forEach(r => roles.add(typeof r === 'string' ? r : String(r)));
      }
      
      // Check Microsoft identity claims format
      const msRoleKey = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
      if (payload[msRoleKey]) {
        if (Array.isArray(payload[msRoleKey])) {
          payload[msRoleKey].forEach(r => roles.add(typeof r === 'string' ? r : String(r)));
        } else {
          roles.add(String(payload[msRoleKey]));
        }
      }
      
      // Check for admin role case-insensitively
      const allRoles = Array.from(roles);
      const hasAdminRole = allRoles.some(role => 
        typeof role === 'string' && role.toLowerCase() === 'admin'
      );
      
      // Set up API client with proper authorization
      const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      api.defaults.headers.common['Authorization'] = tokenValue;
      
      // Store admin status for debugging
      localStorage.setItem('isAdminRole', hasAdminRole ? 'true' : 'false');
      
      // Log repair status
      console.log('🔐 Admin authorization check:', {
        repaired: true,
        hasAdminRole,
        allRoles,
        apiHeadersSet: !!api.defaults.headers.common['Authorization']
      });
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error in admin auth repair:', error);
      return false;
    }
  }
}

// Create and execute the manager
const adminAuthManager = new AdminAuthManager();
export default adminAuthManager;
