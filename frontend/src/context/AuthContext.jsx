import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in on mount
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (err) {
        console.error('Error checking user session:', err);
        setError('Failed to check authentication');
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUpWithEmail = async (email, password) => {
    try {
      setError(null);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (signUpError) {
        setError(signUpError.message);
        return { error: signUpError };
      }
      
      return { data };
    } catch (err) {
      const message = err.message || 'Sign up failed';
      setError(message);
      return { error: err };
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      setError(null);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        setError(signInError.message);
        return { error: signInError };
      }
      
      return { data };
    } catch (err) {
      const message = err.message || 'Sign in failed';
      setError(message);
      return { error: err };
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const { data, error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      
      if (googleError) {
        setError(googleError.message);
        return { error: googleError };
      }
      
      return { data };
    } catch (err) {
      const message = err.message || 'Google sign in failed';
      setError(message);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        setError(signOutError.message);
        return { error: signOutError };
      }
      
      return { data: null };
    } catch (err) {
      const message = err.message || 'Sign out failed';
      setError(message);
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        signOut,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
