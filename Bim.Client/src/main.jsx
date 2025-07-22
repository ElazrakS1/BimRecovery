import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';  // Explicitly adding the .jsx extension
import 'bootstrap/dist/css/bootstrap.min.css'; // Import des styles Bootstrap
import './index.css';
import './alignment-fixes.css'; // Import direct des corrections d'alignement
import axios from 'axios';

// Configuration globale d'axios
axios.defaults.timeout = 30000; // 30 secondes de timeout pour toutes les requêtes
axios.defaults.timeoutErrorMessage = 'Délai d\'attente dépassé, veuillez vérifier votre connexion';

// Intercepteur pour logger les requêtes en mode développement
if (import.meta.env.DEV) {
  axios.interceptors.request.use(request => {
    console.log('Requête sortante:', request.method?.toUpperCase(), request.url);
    return request;
  });
  
  axios.interceptors.response.use(
    response => {
      console.log('Réponse reçue:', response.status, response.config.url);
      return response;
    },
    error => {
      console.error('Erreur de requête:', 
        error.response?.status || error.message, 
        error.config?.url
      );
      return Promise.reject(error);
    }
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ 
      v7_startTransition: true,
      v7_relativeSplatPath: true 
    }} basename={import.meta.env.BASE_URL || "/"}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
