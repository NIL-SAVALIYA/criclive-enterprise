import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, token, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-red-500/30 text-center max-w-md mx-auto my-12 space-y-4">
        <h2 className="text-xl font-bold text-red-400">Access Denied</h2>
        <p className="text-xs text-gray-300">
          Your role (<span className="font-mono text-amber-400 font-bold">{user.role}</span>) does not have permission to view this page.
        </p>
      </div>
    );
  }

  return children;
}
