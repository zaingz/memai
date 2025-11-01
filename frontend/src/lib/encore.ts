import Client, { Local } from '@/client';
import { supabase } from './supabase';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || Local;

// Create singleton client instance with auth token support
let authToken: string | null = null;

export const encoreClient = new Client(apiBaseUrl, {
  headers: () => {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  },
});

// Helper to set auth token
export function setAuthToken(token: string | null) {
  authToken = token;
}

// Auto-attach token on app load
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.access_token) {
    setAuthToken(session.access_token);
  }
});

// Update token on auth state change
supabase.auth.onAuthStateChange((_event, session) => {
  setAuthToken(session?.access_token || null);
});

export default encoreClient;
