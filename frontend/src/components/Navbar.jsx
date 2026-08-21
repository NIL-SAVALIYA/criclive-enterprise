import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  Users,
  BarChart3,
  Radio,
  Settings,
  LogIn,
  LogOut,
  User,
  Calendar,
  Award,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Menu,
  X,
  PlusCircle,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isManager, isOrganizer, isAdmin, isScorer } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setMobileNavOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Live Center', path: '/', icon: Radio },
    { name: 'Fixtures', path: '/fixtures', icon: Calendar },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Teams', path: '/teams', icon: Users },
    { name: 'Players', path: '/players', icon: User }
  ];

  const managerProfile = user?.managerProfile;

  return (
    <nav className="glass-panel sticky top-0 z-50 border-b border-gray-800 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xl backdrop-blur-md bg-gray-950/80">
      {/* Brand Logo */}
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-xl shadow-lg glow-emerald group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-emerald-400 bg-clip-text text-transparent">
              CRICLIVE
            </span>
            <span className="block text-[9px] font-bold tracking-widest text-emerald-400 uppercase">
              ENTERPRISE PLATFORM
            </span>
          </div>
        </Link>
      </div>

      {/* Main Desktop Navigation Links */}
      <div className="hidden md:flex items-center gap-1 bg-gray-900/60 p-1 rounded-xl border border-gray-800/80">
        {navLinks.map((link) => {
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
        {isManager && (
          <Link
            to="/my-fixtures"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              location.pathname === '/my-fixtures' || location.pathname === '/manager/fixtures'
                ? 'bg-emerald-600 text-white shadow-md glow-emerald'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            My Fixtures
          </Link>
        )}
      </div>

      {/* Right Controls: User Profile Dropdown & Mobile Toggle */}
      <div className="flex items-center gap-2.5">
        {user ? (
          <div className="relative" ref={dropdownRef}>
            {/* Account & Hamburger Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all ${
                menuOpen
                  ? 'bg-emerald-950/60 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-gray-900/90 border-gray-800 hover:border-gray-700 hover:bg-gray-850'
              }`}
              aria-label="User account menu"
            >
              <div className="relative">
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={user.firstName}
                    className="w-8 h-8 rounded-lg object-cover border border-gray-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-700 to-teal-500 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm">
                    {user.firstName?.[0] || 'U'}{user.lastName?.[0] || ''}
                  </div>
                )}
                {isManager && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-gray-950" title="Active Manager" />
                )}
              </div>

              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-tight flex items-center gap-1">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                  {managerProfile?.nickname ? `@${managerProfile.nickname}` : user.role}
                </span>
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${menuOpen ? 'rotate-180 text-emerald-400' : ''}`} />
            </button>

            {/* Dropdown Menu Popover */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#0F1422] border border-gray-800 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header User Card */}
                <div className="p-4 bg-gradient-to-b from-gray-900/90 to-[#0F1422] border-b border-gray-800/80">
                  <div className="flex items-center gap-3">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt={user.firstName}
                        className="w-11 h-11 rounded-xl object-cover border-2 border-emerald-500/50 shadow-md"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                        {user.firstName?.[0] || 'U'}{user.lastName?.[0] || ''}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      {managerProfile?.nickname && (
                        <p className="text-xs font-mono text-emerald-400 font-semibold truncate mt-0.5">
                          @{managerProfile.nickname}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges / Active Capabilities */}
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-gray-800/60">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-800 text-gray-300 border border-gray-700">
                      {user.role}
                    </span>
                    {isManager && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" /> Manager
                      </span>
                    )}
                    {isOrganizer && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-950/80 text-amber-300 border border-amber-600/40 flex items-center gap-1">
                        <Trophy className="w-2.5 h-2.5" /> Organizer
                      </span>
                    )}
                    {isAdmin && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-950/80 text-purple-300 border border-purple-600/40 flex items-center gap-1">
                        <Settings className="w-2.5 h-2.5" /> Super Admin
                      </span>
                    )}
                  </div>
                </div>

                {/* Capability Links */}
                <div className="p-2 space-y-1 text-xs">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800/60 font-medium transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span>My Profile</span>
                  </Link>

                  {/* Manager Capabilities */}
                  {isManager ? (
                    <>
                      <Link
                        to="/manager/profile"
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800/60 font-medium transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Shield className="w-4 h-4 text-emerald-400" />
                          <span>Manager Profile</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                          Active
                        </span>
                      </Link>
                      <Link
                        to="/my-fixtures"
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800/60 font-medium transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <CalendarCheck className="w-4 h-4 text-emerald-400" />
                          <span>My Fixtures & Playing XI</span>
                        </div>
                      </Link>
                    </>
                  ) : (
                    <Link
                      to="/manager/register"
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/60 hover:text-emerald-200 border border-emerald-800/40 font-semibold transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <PlusCircle className="w-4 h-4 text-emerald-400" />
                        <span>Register as Manager</span>
                      </div>
                      <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded shadow-sm">
                        Free
                      </span>
                    </Link>
                  )}

                  {/* Organizer Capabilities */}
                  {isOrganizer ? (
                    <Link
                      to="/tournaments"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800/60 font-medium transition-colors"
                    >
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>Organizer Console</span>
                    </Link>
                  ) : (
                    <Link
                      to="/apply-organizer"
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800/60 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span>Become an Organizer</span>
                      </div>
                    </Link>
                  )}

                  {/* Admin / Scorer Consoles */}
                  {(isAdmin || isScorer) && (
                    <Link
                      to="/admin/scorer"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800/60 font-medium transition-colors"
                    >
                      <Settings className="w-4 h-4 text-teal-400" />
                      <span>Scorer Live Console</span>
                    </Link>
                  )}

                  {isAdmin && (
                    <Link
                      to="/admin/dashboard"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800/60 font-medium transition-colors"
                    >
                      <BarChart3 className="w-4 h-4 text-purple-400" />
                      <span>Admin Management Dashboard</span>
                    </Link>
                  )}
                </div>

                {/* Footer / Logout */}
                <div className="p-2 border-t border-gray-800/80 bg-gray-950/40">
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-transparent hover:border-red-900/40 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md glow-emerald transition-all"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign In
            </Link>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="md:hidden p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileNavOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#0B0F19] border-b border-gray-800 p-4 shadow-2xl z-40 animate-in slide-in-from-top-2">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-gray-300 hover:bg-gray-850'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
            {isManager && (
              <Link
                to="/my-fixtures"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-emerald-400 hover:bg-emerald-950/30"
              >
                <CalendarCheck className="w-4 h-4" />
                My Fixtures & Playing XI
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
