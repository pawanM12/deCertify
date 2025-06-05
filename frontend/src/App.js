// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Web3Provider } from './contexts/Web3Context';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import OrganizationDashboard from './pages/OrganizationDashboard';
import VerifierPage from './pages/VerifierPage'; // For the QR scanner/verifier

// PrivateRoute component to protect routes
const PrivateRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.userType)) {
    return <Navigate to="/" replace />; // Redirect to landing or unauthorized page
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Web3Provider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route
              path="/student-dashboard"
              element={
                <PrivateRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/organization-dashboard"
              element={
                <PrivateRoute allowedRoles={['organization']}>
                  <OrganizationDashboard />
                </PrivateRoute>
              }
            />
            <Route path="/verify" element={<VerifierPage />} /> {/* Public route for verifier */}
            <Route path="*" element={<Navigate to="/" replace />} /> {/* Catch-all for undefined routes */}
          </Routes>
        </Web3Provider>
      </AuthProvider>
    </Router>
  );
}

export default App;

