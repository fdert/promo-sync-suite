import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useAgency, Agency } from '@/hooks/useAgency';

interface AgencyContextType {
  currentAgency: Agency | null;
  userRole: string | null;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  refetchAgency: () => void;
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

export const useAgencyContext = () => {
  const context = useContext(AgencyContext);
  if (context === undefined) {
    throw new Error('useAgencyContext must be used within an AgencyProvider');
  }
  return context;
};

export const AgencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { 
    currentAgency, 
    userRole, 
    loading, 
    hasPermission, 
    refetch 
  } = useAgency();

  const value = {
    currentAgency,
    userRole,
    loading,
    hasPermission,
    refetchAgency: refetch
  };

  return (
    <AgencyContext.Provider value={value}>
      {children}
    </AgencyContext.Provider>
  );
};