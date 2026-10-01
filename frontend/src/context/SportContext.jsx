import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  SPORTS_REGISTRY,
  getSportConfig,
  getAllRegisteredSports,
  hasCapability,
  getSportFromPath
} from '../sports/sportsRegistry';

const SportContext = createContext(null);

export function SportProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [sportsList, setSportsList] = useState(getAllRegisteredSports());
  const [currentSport, setCurrentSport] = useState(() => {
    // 1. Check path first
    const pathSport = getSportFromPath(location.pathname);
    if (pathSport) return pathSport;

    // 2. Check localStorage
    const saved = localStorage.getItem('selectedSport');
    return (saved && typeof saved === 'string') ? saved.toUpperCase().trim() : 'CRICKET';
  });

  // Sync sport if path explicitly indicates sport (e.g. /badminton/live or /cricket/fixtures)
  useEffect(() => {
    const pathSport = getSportFromPath(location.pathname);
    if (pathSport && pathSport !== currentSport) {
      setCurrentSport(pathSport);
      localStorage.setItem('selectedSport', pathSport);
    }
  }, [location.pathname]);

  // Fetch backend sports list
  useEffect(() => {
    async function fetchSports() {
      try {
        const res = await api.get('/sports');
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          // Merge API data with registry metadata
          const merged = res.data.data.map((s) => {
            const reg = SPORTS_REGISTRY[s.code] || {};
            return {
              ...reg,
              ...s,
              icon: s.icon || reg.icon || '🏆'
            };
          });
          setSportsList(merged);
        }
      } catch (err) {
        console.warn('Could not fetch sports from API, using default sports registry:', err);
      }
    }
    fetchSports();
  }, []);

  const sportConfig = getSportConfig(currentSport);
  const capabilities = sportConfig.capabilities || {};
  const terminology = sportConfig.terminology || {};

  const setSport = (sportCode, options = {}) => {
    if (!sportCode || typeof sportCode !== 'string') return;
    const cleanCode = sportCode.toUpperCase().trim();
    if (!SPORTS_REGISTRY[cleanCode]) return;

    setCurrentSport(cleanCode);
    localStorage.setItem('selectedSport', cleanCode);

    // If options.redirect is requested or if user is on a sport-specific route, transition route
    if (options.redirect || location.pathname.startsWith('/cricket') || location.pathname.startsWith('/badminton')) {
      const targetPrefix = `/${cleanCode.toLowerCase()}`;
      let suffix = location.pathname.replace(/^\/(cricket|badminton)/, '');
      if (!suffix || suffix === '/') suffix = '/live';
      navigate(`${targetPrefix}${suffix}`);
    }
  };

  const activeSportMeta = sportsList.find((s) => s.code === currentSport) || sportConfig;
  const isCricket = currentSport === 'CRICKET';
  const isBadminton = currentSport === 'BADMINTON';

  return (
    <SportContext.Provider
      value={{
        currentSport,
        sportConfig,
        capabilities,
        terminology,
        setSport,
        sportsList,
        activeSportMeta,
        isCricket,
        isBadminton,
        hasCap: (cap) => hasCapability(currentSport, cap)
      }}
    >
      {children}
    </SportContext.Provider>
  );
}

export function useSport() {
  const context = useContext(SportContext);
  if (!context) {
    throw new Error('useSport must be used within a SportProvider');
  }
  return context;
}
