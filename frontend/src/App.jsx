import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SportProvider } from './context/SportContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import LiveMatchCenter from './pages/LiveMatchCenter';
import Tournaments from './pages/Tournaments';
import TeamsAndPlayers from './pages/TeamsAndPlayers';
import Players from './pages/Players';
import BecomeOrganizer from './pages/BecomeOrganizer';
import AdminScoringConsole from './pages/AdminScoringConsole';
import AdminDashboard from './pages/AdminDashboard';
import MatchControlCenter from './pages/MatchControlCenter';
import Fixtures from './pages/Fixtures';
import DedicatedScorerConsole from './pages/DedicatedScorerConsole';
import ManagerFixtures from './pages/ManagerFixtures';
import Profile from './pages/Profile';
import ManagerRegister from './pages/ManagerRegister';
import ManagerProfilePage from './pages/ManagerProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SportProvider>
          <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-['Outfit',sans-serif]">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Routes>
              {/* Public Viewer Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/fixtures" element={<Fixtures />} />
              <Route path="/matches/:matchId" element={<LiveMatchCenter />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/teams" element={<TeamsAndPlayers />} />
              <Route path="/players" element={<Players />} />

              {/* User Profile & Capability Routes */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/register"
                element={
                  <ProtectedRoute>
                    <ManagerRegister />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/profile"
                element={
                  <ProtectedRoute>
                    <ManagerProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-fixtures"
                element={
                  <ProtectedRoute>
                    <ManagerFixtures />
                  </ProtectedRoute>
                }
              />

              {/* Dedicated Guest Match Scorer Console (Token Authenticated) */}
              <Route path="/score/:token" element={<DedicatedScorerConsole />} />
              <Route path="/score-match/:token" element={<DedicatedScorerConsole />} />
              <Route
                path="/apply-organizer"
                element={
                  <ProtectedRoute>
                    <BecomeOrganizer />
                  </ProtectedRoute>
                }
              />

              {/* Protected Team Manager Console (All Manager URL variants supported) */}
              <Route
                path="/manager/fixtures"
                element={
                  <ProtectedRoute>
                    <ManagerFixtures />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-matches"
                element={
                  <ProtectedRoute>
                    <ManagerFixtures />
                  </ProtectedRoute>
                }
              />

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
              <Route
                path="/admin/match-control/:matchId"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'SCORER']}>
                    <MatchControlCenter />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </SportProvider>
    </AuthProvider>
  </BrowserRouter>
  );
}
