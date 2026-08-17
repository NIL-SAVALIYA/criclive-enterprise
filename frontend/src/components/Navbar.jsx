import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Users, BarChart3, Radio, Settings, LogIn, LogOut, User, Calendar, Award } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();

  const navLinks = [
    { name: 'Home & Live', path: '/', icon: Radio, roles: [] },
    { name: 'Fixtures', path: '/fixtures', icon: Calendar, roles: [] },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy, roles: [] },
    { name: 'Teams', path: '/teams', icon: Users, roles: [] },
    { name: 'Players', path: '/players', icon: User, roles: [] },
    { name: 'Become Organizer', path: '/apply-organizer', icon: Award, roles: ['VIEWER'] },
    { name: 'Admin Scorer Console', path: '/admin/scorer', icon: Settings, roles: ['ADMIN', 'SCORER'] },
    { name: 'Admin Dashboard', path: '/admin/dashboard', icon: BarChart3, roles: ['ADMIN'] }
  ];

  return (
    <nav className="glass-panel sticky top-0 z-50 border-b border-gray-800 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xl">
      {/* Brand Logo */}
      <Link to="/" className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-xl shadow-lg glow-emerald">
          ⚡
        </div>
        <div>
          <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-emerald-400 bg-clip-text text-transparent">
            CRICLIVE
          </span>
          <span className="block text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
            ENTERPRISE PLATFORM
          </span>
        </div>
      </Link>

      {/* Role Based Navigation Links */}
      <div className="hidden md:flex items-center gap-1 bg-gray-900/60 p-1 rounded-xl border border-gray-800">
        {navLinks.map((link) => {
          if (link.roles.length > 0 && !hasRole(link.roles)) return null;

          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md glow-emerald'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* Authentication User Controls */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right text-xs">
              <span className="font-bold text-white flex items-center gap-1">
                <User className="w-3 h-3 text-emerald-400" /> {user.firstName} {user.lastName}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">{user.role}</span>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-red-500/50 hover:bg-red-950/30 text-gray-400 hover:text-red-400 transition-all text-xs font-semibold flex items-center gap-1.5"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md glow-emerald transition-all"
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
