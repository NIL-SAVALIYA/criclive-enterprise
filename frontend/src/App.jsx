import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import LiveMatchCenter from './pages/LiveMatchCenter';
import Tournaments from './pages/Tournaments';
import TeamsAndPlayers from './pages/TeamsAndPlayers';
import Players from './pages/Players';
import AdminScoringConsole from './pages/AdminScoringConsole';
import AdminDashboard from './pages/AdminDashboard';
import Fixtures from './pages/Fixtures';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-['Outfit',sans-serif]">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Routes>
              {/* Public Viewer Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/fixtures" element={<Fixtures />} />
              <Route path="/matches/:matchId" element={<LiveMatchCenter />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/teams" element={<TeamsAndPlayers />} />
              <Route path="/players" element={<Players />} />

              {/* Protected Scorer Console (ADMIN or SCORER role) */}
              <Route
                path="/admin/scorer"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'SCORER']}>
                    <AdminScoringConsole />
                  </ProtectedRoute>
                }
              />

              {/* Protected Admin Control Panel (ADMIN role) */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
