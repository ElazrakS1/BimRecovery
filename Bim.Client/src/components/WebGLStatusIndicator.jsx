/**
 * WebGL Status Indicator Component
 * Shows the current WebGL status and recovery progress to the user
 */

import React, { useState, useEffect } from 'react';
import './WebGLStatusIndicator.css';

const WebGLStatusIndicator = ({ webglStatus, onRetry, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (webglStatus && webglStatus.type !== 'ok') {
      setIsVisible(true);
      
      // Simulate progress for recovery attempts
      if (webglStatus.type === 'recovering') {
        const interval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) {
              clearInterval(interval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);
        
        return () => clearInterval(interval);
      }
    } else {
      setIsVisible(false);
      setProgress(0);
    }
  }, [webglStatus]);

  if (!isVisible || !webglStatus) {
    return null;
  }

  const getStatusColor = () => {
    switch (webglStatus.type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'recovering': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (webglStatus.type) {
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'recovering': return '🔄';
      case 'success': return '✅';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`webgl-status-indicator ${getStatusColor()} border-l-4 p-4 mb-4 rounded-r-lg shadow-lg fixed top-4 right-4 max-w-md z-50 transition-all duration-300`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-xl">{getIcon()}</span>
        </div>
        <div className="ml-3 flex-grow">
          <h3 className="text-sm font-semibold mb-1">
            {webglStatus.title || 'WebGL Status'}
          </h3>
          <p className="text-sm mb-2">
            {webglStatus.message}
          </p>
          
          {webglStatus.type === 'recovering' && (
            <div className="mb-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs mt-1">Recovering... {progress}%</p>
            </div>
          )}
          
          {webglStatus.suggestions && webglStatus.suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Suggestions:</p>
              <ul className="text-xs space-y-1">
                {webglStatus.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-3 flex space-x-2">
            {onRetry && webglStatus.type === 'error' && (
              <button
                onClick={onRetry}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={() => {
                  setIsVisible(false);
                  onDismiss();
                }}
                className="text-xs bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebGLStatusIndicator;
