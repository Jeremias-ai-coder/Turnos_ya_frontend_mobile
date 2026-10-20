import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { Business } from '../types';
import { useAuth } from './AuthContext';

const ROLE_MODE_STORAGE_KEY = '@turnos_ya:role_mode';
const SELECTED_BIZ_STORAGE_KEY = '@turnos_ya:selected_biz_id';

interface OwnerContextType {
  businesses: Business[];
  selectedBusiness: Business | null;
  setSelectedBusiness: (biz: Business | null) => void;
  loading: boolean;
  refreshBusinesses: () => Promise<void>;
  isOwnerMode: boolean;
  isAdmin: boolean;
  activeRoleMode: 'owner' | 'client';
  toggleRoleMode: () => Promise<void>;
  setRoleMode: (mode: 'owner' | 'client') => Promise<void>;
}

const OwnerContext = createContext<OwnerContextType | undefined>(undefined);

export const OwnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusinessState] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeRoleMode, setActiveRoleModeState] = useState<'owner' | 'client'>('owner');

  const roleLower = (user?.role || '').toLowerCase();
  const isActualOwner = roleLower === 'owner' || user?.role === 'BUSINESS_OWNER';
  const isAdmin = roleLower === 'administrator' || roleLower === 'admin';

  // Determine if owner view should be active
  const isOwnerMode = isActualOwner || (isAdmin && activeRoleMode === 'owner');

  // Load saved role mode for admin
  useEffect(() => {
    const loadSavedRoleMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(ROLE_MODE_STORAGE_KEY);
        if (savedMode === 'client' || savedMode === 'owner') {
          setActiveRoleModeState(savedMode);
        } else if (isAdmin) {
          setActiveRoleModeState('owner');
        }
      } catch {
        // Fallback default
      }
    };

    if (isAdmin) {
      loadSavedRoleMode();
    }
  }, [isAdmin]);

  const setRoleMode = async (mode: 'owner' | 'client') => {
    setActiveRoleModeState(mode);
    try {
      await AsyncStorage.setItem(ROLE_MODE_STORAGE_KEY, mode);
    } catch {
      // Ignored
    }
  };

  const toggleRoleMode = async () => {
    const nextMode = activeRoleMode === 'owner' ? 'client' : 'owner';
    await setRoleMode(nextMode);
  };

  const setSelectedBusiness = (biz: Business | null) => {
    setSelectedBusinessState(biz);
    if (biz) {
      AsyncStorage.setItem(SELECTED_BIZ_STORAGE_KEY, String(biz.id)).catch(() => {});
    } else {
      AsyncStorage.removeItem(SELECTED_BIZ_STORAGE_KEY).catch(() => {});
    }
  };

  const refreshBusinesses = useCallback(async () => {
    if (!isOwnerMode) {
      setBusinesses([]);
      setSelectedBusinessState(null);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/businesses/my');
      const raw = res.data?.data ?? res.data;
      const list: Business[] = Array.isArray(raw) ? raw : [];
      setBusinesses(list);

      if (list.length > 0) {
        // Try restoring previously selected business id
        const savedIdStr = await AsyncStorage.getItem(SELECTED_BIZ_STORAGE_KEY);
        const savedId = savedIdStr ? parseInt(savedIdStr, 10) : null;
        const matching = savedId ? list.find((b) => b.id === savedId) : null;
        setSelectedBusinessState(matching || list[0]);
      } else {
        setSelectedBusinessState(null);
      }
    } catch (err) {
      console.warn('Error fetching owner businesses:', err);
      setBusinesses([]);
      setSelectedBusinessState(null);
    } finally {
      setLoading(false);
    }
  }, [isOwnerMode]);

  useEffect(() => {
    if (isOwnerMode && user) {
      refreshBusinesses();
    } else {
      setBusinesses([]);
      setSelectedBusinessState(null);
    }
  }, [isOwnerMode, user, refreshBusinesses]);

  return (
    <OwnerContext.Provider
      value={{
        businesses,
        selectedBusiness,
        setSelectedBusiness,
        loading,
        refreshBusinesses,
        isOwnerMode,
        isAdmin,
        activeRoleMode,
        toggleRoleMode,
        setRoleMode,
      }}
    >
      {children}
    </OwnerContext.Provider>
  );
};

export const useOwner = (): OwnerContextType => {
  const context = useContext(OwnerContext);
  if (!context) {
    throw new Error('useOwner must be used within an OwnerProvider');
  }
  return context;
};
