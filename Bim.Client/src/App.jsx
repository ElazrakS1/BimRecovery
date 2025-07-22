import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { CollaborationProvider } from './components/Collaboration/CollaborationProvider';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import Dashboard from './components/dashboard/Dashboard';
import IFCViewer from './components/IFCViewer';
import UserManagement from './components/users/UserManagement';
import Projects from './pages/Projects';
import TasksPage from './pages/tasks/index.jsx';
import InteroperabilityPage from './pages/integration/index';
import Settings from './pages/settings/Settings';
import TestTheme from './components/TestTheme';
import ProtectedRoute from './components/auth/ProtectedRoute';
import './App.css';

// Auto-load admin authorization fix
import './utils/adminAuthManager';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <NotificationProvider>
            <CollaborationProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                
                {/* Protected routes */}
                <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
                <Route path="/projects/:id" element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
                <Route path="/maquettes" element={<ProtectedRoute><Layout><IFCViewer /></Layout></ProtectedRoute>} />
                <Route path="/documents" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
                <Route path="/tasks" element={<ProtectedRoute><Layout><InteroperabilityPage isAdminView={true} /></Layout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
                
                {/* Route de test du thème */}
                <Route path="/test-theme" element={<TestTheme />} />
                
                {/* Admin-only routes */}
                <Route path="/users" element={
                  <ProtectedRoute adminOnly={true}>
                    <Layout><UserManagement /></Layout>
                  </ProtectedRoute>
                } />
                <Route path="/analytics" element={
                  <ProtectedRoute adminOnly={true}>
                    <Layout><Dashboard /></Layout>
                  </ProtectedRoute>
                } />
                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
            </CollaborationProvider>
          </NotificationProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;