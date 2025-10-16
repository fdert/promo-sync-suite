import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signUpAdmin: (email: string, password: string, fullName: string, role: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Graceful fallback to prevent crashes if used outside provider briefly
    console.warn('useAuth used outside AuthProvider - falling back to default stub');
    return {
      user: null,
      session: null,
      signUp: async () => ({ error: null }),
      signUpAdmin: async () => ({ error: null }),
      signIn: async () => ({ error: null }),
      signOut: async () => {},
      loading: true,
    } as AuthContextType;
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    
    return { error };
  };

  const signUpAdmin = async (email: string, password: string, fullName: string, role: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role
        }
      }
    });
    
    // Rely on DB trigger to assign role from user_metadata.role
    // No direct insert here to avoid RLS issues

    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error };
  };

  const signOut = async () => {
    try {
      // Clear local state first to prevent race conditions
      setUser(null);
      setSession(null);
      // Revoke tokens everywhere and clear local storage
      await supabase.auth.signOut({ scope: 'global' });
      try {
        localStorage.removeItem('sb-pqrzkfpowjutylegdcxj-auth-token');
      } catch (e) {
        // ignore storage errors
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
    // Always redirect to auth page
    window.location.href = '/auth';
  };

  const value = {
    user,
    session,
    signUp,
    signUpAdmin,
    signIn,
    signOut,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};