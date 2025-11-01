import Client, { Local } from '@/client';
import { supabase } from './supabase';

// Get API base URL with validation
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  // In production, VITE_API_BASE_URL must be set
  if (import.meta.env.PROD && !envUrl) {
    throw new Error(
      'VITE_API_BASE_URL environment variable is required in production. ' +
      'Please set it in your Vercel project settings.'
    );
  }

  // Use env URL if set, otherwise Local for development
  return envUrl || Local;
};

const apiBaseUrl = getApiBaseUrl();

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
  console.log('[Auth] Token updated:', token ? `${token.substring(0, 20)}...` : 'null');
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
