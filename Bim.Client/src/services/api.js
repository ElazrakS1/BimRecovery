import api from '../config/api.config';

/**
 * Helper function for making API calls with standard error handling
 * @param {string} url - API endpoint URL
 * @param {Object} options - Request options
 * @returns {Promise<any>} - API response data
 */
export const apiCall = async (url, options = {}) => {
  try {
    const response = await api(url, options);
    return response.data;
  } catch (error) {
    console.error(`API error (${url}):`, error);
    
    // Standardize error handling
    const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
    const errorDetails = error.response?.data?.details || {};
    
    // Re-throw with more context
    const enhancedError = new Error(errorMessage);
    enhancedError.status = error.response?.status;
    enhancedError.details = errorDetails;
    enhancedError.originalError = error;
    
    throw enhancedError;
  }
};

export default {
  apiCall
};
