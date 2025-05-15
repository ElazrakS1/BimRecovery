import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import IFCViewer from './components/IFCViewer';
import UserManagement from './components/users/UserManagement';
import Projects from './pages/Projects';
import Settings from './pages/settings/Settings';
import ProtectedRoute from './components/auth/ProtectedRoute';
import './App.css';

// Configuration des flags pour React Router v7
const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

function App() {
  return (
    <LanguageProvider>
      <Router {...router}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/projects/*" element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
          <Route path="/maquettes" element={<ProtectedRoute adminOnly={true}><Layout><IFCViewer /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute adminOnly={true}><Layout><UserManagement /></Layout></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute adminOnly={true}><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
