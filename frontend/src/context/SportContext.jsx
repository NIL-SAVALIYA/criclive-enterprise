import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const SportContext = createContext(null);

const DEFAULT_SPORTS = [
  { code: 'CRICKET', name: 'Cricket', icon: '🏏', isActive: true },
  { code: 'BADMINTON', name: 'Badminton', icon: '🏸', isActive: true }
];

export function SportProvider({ children }) {
  const [sportsList, setSportsList] = useState(DEFAULT_SPORTS);
  const [currentSport, setCurrentSport] = useState(() => {
    const saved = localStorage.getItem('selectedSport');
    return (saved && typeof saved === 'string') ? saved.toUpperCase().trim() : 'CRICKET';
  });

  useEffect(() => {
    async function fetchSports() {
      try {
        const res = await api.get('/sports');
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setSportsList(res.data.data);
        }
      } catch (err) {
        console.warn('Could not fetch sports from API, using default sports list:', err);
      }
    }
    fetchSports();
  }, []);

  const setSport = (sportCode) => {
    if (!sportCode || typeof sportCode !== 'string') return;
    const cleanCode = sportCode.toUpperCase().trim();
    setCurrentSport(cleanCode);
    localStorage.setItem('selectedSport', cleanCode);
  };

  const activeSportMeta = sportsList.find((s) => s.code === currentSport) || {
    code: currentSport,
    name: currentSport === 'BADMINTON' ? 'Badminton' : 'Cricket',
    icon: currentSport === 'BADMINTON' ? '🏸' : '🏏'
  };

  const isCricket = currentSport === 'CRICKET';
  const isBadminton = currentSport === 'BADMINTON';

  return (
    <SportContext.Provider
      value={{
        currentSport,
        setSport,
        sportsList,
        activeSportMeta,
        isCricket,
        isBadminton
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
