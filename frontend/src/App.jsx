import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Commissions from './pages/Commissions';
import Agencies from './pages/Agencies';
import AdminPanel from './pages/AdminPanel';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';

function PrivateRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
          <Route path="/commissions" element={<PrivateRoute><Commissions /></PrivateRoute>} />
          <Route path="/agencies" element={<PrivateRoute><Agencies /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute requireAdmin={true}><AdminPanel /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
