/**
 * Error Prevention Utilities
 * Prevents error loops and provides safe error handling
 */

// Global error tracking
let globalErrorCount = 0;
let lastGlobalErrorTime = 0;
const MAX_GLOBAL_ERRORS = 10;
const ERROR_RESET_INTERVAL = 30000; // 30 seconds

/**
 * Safely handles string operations that might fail with null/undefined
 * @param {any} value - The value to check
 * @param {string} operation - The operation to perform ('trim', 'toLowerCase', etc.)
 * @returns {string} - Safe result or empty string
 */
export function safeStringOperation(value, operation = 'toString') {
  try {
    if (value === null || value === undefined) {
      return '';
    }
    
    // Convert to string first if it's not already
    let str = value;
    if (typeof str !== 'string') {
      if (typeof str.toString === 'function') {
        str = str.toString();
      } else {
        str = String(str);
      }
    }
    
    // Perform the requested operation
    switch (operation) {
      case 'trim':
        return str.trim();
      case 'toLowerCase':
        return str.toLowerCase();
      case 'toUpperCase':
        return str.toUpperCase();
      default:
        return str;
    }
  } catch (error) {
    console.warn('Safe string operation failed:', error);
    return '';
  }
}

/**
 * Safely extracts error message from error object
 * @param {Error|any} error - The error object
 * @returns {string} - Safe error message
 */
export function safeGetErrorMessage(error) {
  if (!error) return '';
  
  try {
    // Try multiple ways to get the error message
    if (typeof error === 'string') {
      return error;
    }
    
    if (error.message) {
      return safeStringOperation(error.message, 'toString');
    }
    
    if (typeof error.toString === 'function') {
      return safeStringOperation(error.toString(), 'toString');
    }
    
    return 'Unknown error';
  } catch (extractionError) {
    console.warn('Error message extraction failed:', extractionError);
    return 'Error message extraction failed';
  }
}

/**
 * Safely extracts error stack from error object
 * @param {Error|any} error - The error object
 * @returns {string} - Safe error stack
 */
export function safeGetErrorStack(error) {
  try {
    if (!error || !error.stack) return '';
    return safeStringOperation(error.stack, 'toString');
  } catch (extractionError) {
    console.warn('Error stack extraction failed:', extractionError);
    return '';
  }
}

/**
 * Checks if we should handle this error or ignore it to prevent loops
 * @returns {boolean} - True if we should handle the error
 */
export function shouldHandleError() {
  const now = Date.now();
  
  // Reset counter if enough time has passed
  if (now - lastGlobalErrorTime > ERROR_RESET_INTERVAL) {
    globalErrorCount = 0;
  }
  
  // Check if we've exceeded the global error limit
  if (globalErrorCount >= MAX_GLOBAL_ERRORS) {
    return false;
  }
  
  // Increment counter and update timestamp
  globalErrorCount++;
  lastGlobalErrorTime = now;
  
  return true;
}

/**
 * Creates a throttled error handler to prevent spam
 * @param {Function} handler - The error handler function
 * @param {number} delay - Throttle delay in milliseconds
 * @returns {Function} - Throttled handler
 */
export function createThrottledErrorHandler(handler, delay = 1000) {
  let lastCall = 0;
  let timeoutId = null;
  
  return function(...args) {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      handler.apply(this, args);
    } else {
      // Clear existing timeout and set a new one
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        handler.apply(this, args);
      }, delay);
    }
  };
}

/**
 * Safely checks if a string contains a substring
 * @param {any} str - The string to check
 * @param {string} substring - The substring to look for
 * @returns {boolean} - True if substring is found
 */
export function safeStringIncludes(str, substring) {
  try {
    const safeStr = safeStringOperation(str, 'toString');
    const safeSubstring = safeStringOperation(substring, 'toString');
    return safeStr.includes(safeSubstring);
  } catch (error) {
    console.warn('Safe string includes check failed:', error);
    return false;
  }
}
