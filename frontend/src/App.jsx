import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import CreateTeam from './pages/CreateTeam';
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
                {/* Canonical Root Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/fixtures" element={<Fixtures />} />
                <Route path="/matches/:matchId" element={<LiveMatchCenter />} />
                <Route path="/tournaments" element={<Tournaments />} />
                <Route path="/teams" element={<TeamsAndPlayers />} />
                <Route path="/players" element={<Players />} />

                {/* Explicit Sport-Specific Routes (Cricket) */}
                <Route path="/cricket" element={<Home />} />
                <Route path="/cricket/live" element={<Home />} />
                <Route path="/cricket/fixtures" element={<Fixtures />} />
                <Route path="/cricket/tournaments" element={<Tournaments />} />
                <Route path="/cricket/teams" element={<TeamsAndPlayers />} />
                <Route
                  path="/cricket/teams/create"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER']}>
                      <CreateTeam />
                    </ProtectedRoute>
                  }
                />
                <Route path="/cricket/players" element={<Players />} />
                <Route path="/cricket/matches/:matchId" element={<LiveMatchCenter />} />
                <Route path="/cricket/score/:token" element={<DedicatedScorerConsole />} />
                <Route
                  path="/cricket/admin/scorer"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'SCORER']}>
                      <AdminScoringConsole />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cricket/admin/match-control/:matchId"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'SCORER']}>
                      <MatchControlCenter />
                    </ProtectedRoute>
                  }
                />

                {/* Explicit Sport-Specific Routes (Badminton) */}
                <Route path="/badminton" element={<Home />} />
                <Route path="/badminton/live" element={<Home />} />
                <Route path="/badminton/fixtures" element={<Fixtures />} />
                <Route path="/badminton/tournaments" element={<Tournaments />} />
                <Route path="/badminton/teams" element={<TeamsAndPlayers />} />
                <Route
                  path="/badminton/teams/create"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER']}>
                      <CreateTeam />
                    </ProtectedRoute>
                  }
                />
                <Route path="/badminton/players" element={<Players />} />
                <Route path="/badminton/matches/:matchId" element={<LiveMatchCenter />} />
                <Route path="/badminton/score/:token" element={<DedicatedScorerConsole />} />
                <Route
                  path="/badminton/admin/scorer"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'SCORER']}>
                      <AdminScoringConsole />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/badminton/admin/match-control/:matchId"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'SCORER']}>
                      <MatchControlCenter />
                    </ProtectedRoute>
                  }
                />

                {/* Explicit Sport-Specific Routes (Football) */}
                <Route path="/football" element={<Home />} />
                <Route path="/football/live" element={<Home />} />
                <Route path="/football/fixtures" element={<Fixtures />} />
                <Route path="/football/tournaments" element={<Tournaments />} />
                <Route path="/football/teams" element={<TeamsAndPlayers />} />
                <Route
                  path="/football/teams/create"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER']}>
                      <CreateTeam />
                    </ProtectedRoute>
                  }
                />
                <Route path="/football/players" element={<Players />} />
                <Route path="/football/matches/:matchId" element={<LiveMatchCenter />} />
                <Route path="/football/score/:token" element={<DedicatedScorerConsole />} />
                <Route
                  path="/football/admin/scorer"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'SCORER']}>
                      <AdminScoringConsole />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/football/admin/match-control/:matchId"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'SCORER']}>
                      <MatchControlCenter />
                    </ProtectedRoute>
                  }
                />

                {/* Explicit Sport-Specific Routes (Table Tennis) */}
                <Route path="/table-tennis" element={<Home />} />
                <Route path="/table-tennis/live" element={<Home />} />
                <Route path="/table-tennis/fixtures" element={<Fixtures />} />
                <Route path="/table-tennis/tournaments" element={<Tournaments />} />
                <Route path="/table-tennis/teams" element={<TeamsAndPlayers />} />
                <Route
                  path="/table-tennis/teams/create"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER']}>
                      <CreateTeam />
                    </ProtectedRoute>
                  }
                />
                <Route path="/table-tennis/players" element={<Players />} />
                <Route path="/table-tennis/matches/:matchId" element={<LiveMatchCenter />} />
                <Route path="/table-tennis/score/:token" element={<DedicatedScorerConsole />} />
                <Route
                  path="/table-tennis/admin/scorer"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'SCORER']}>
                      <AdminScoringConsole />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/table-tennis/admin/match-control/:matchId"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'SCORER']}>
                      <MatchControlCenter />
                    </ProtectedRoute>
                  }
                />

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

                {/* Dedicated Match Scorer Consoles (Token / Scoring Code Authenticated) */}
                <Route path="/score/:token" element={<DedicatedScorerConsole />} />
                <Route path="/score/:scoringCode" element={<DedicatedScorerConsole />} />
                <Route path="/score-match/:token" element={<DedicatedScorerConsole />} />
                <Route path="/score-match/:scoringCode" element={<DedicatedScorerConsole />} />
                <Route
                  path="/apply-organizer"
                  element={
                    <ProtectedRoute>
                      <BecomeOrganizer />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Team Manager Console */}
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
