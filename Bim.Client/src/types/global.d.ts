// Add the property to the Window interface
declare global {
  interface Window {
    _authCheckInProgress: boolean;
  }
}

export {};
