import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface GoogleOAuthResponse {
  code?: string;
  error?: string;
}

interface TokenResponse {
  access_token: string;
  id_token: string;
  error?: string;
  error_description?: string;
}

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleOAuthResponse) => void;
            redirect_uri?: string;
          }) => {
            requestCode: () => void;
          };
        };
      };
    };
  }
}

export const useGoogleAuth = () => {
  const { loginWithToken } = useAuth();

  const initializeGoogleAuth = useCallback(() => {
    // Load Google OAuth script if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      console.log('Starting Google OAuth flow...');
      // Initialize Google OAuth
      initializeGoogleAuth();

      // Wait for Google to be available
      await new Promise<void>((resolve) => {
        const checkGoogle = () => {
          if (window.google) {
            console.log('Google OAuth library loaded');
            resolve();
          } else {
            setTimeout(checkGoogle, 100);
          }
        };
        checkGoogle();
      });

      console.log('Creating Google OAuth client...');
      // Create Google OAuth client for authorization code flow
      const client = window.google.accounts.oauth2.initCodeClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        redirect_uri: window.location.origin, // Use current origin as redirect URI
        callback: async (response: GoogleOAuthResponse) => {
          console.log('Google OAuth callback triggered:', response);
          
          if (response.error) {
            console.error('Google OAuth error:', response.error);
            throw new Error(`Google OAuth error: ${response.error}`);
          }

          if (!response.code) {
            console.error('No authorization code in response:', response);
            throw new Error('No authorization code received');
          }

          try {
            console.log('Sending authorization code to backend...');
            // Send the authorization code to our backend for processing
            const authResponse = await api.post('/auth/google/code', {
              code: response.code,
            });

            console.log('Backend response:', authResponse.data);
            // Login with the token
            await loginWithToken(authResponse.data.access_token);
            console.log('Google OAuth login completed successfully');
          } catch (error) {
            console.error('Backend authentication error:', error);
            throw error;
          }
        },
      });

      console.log('Requesting authorization code...');
      // Request authorization code
      client.requestCode();
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }, [initializeGoogleAuth, loginWithToken]);

  return {
    signInWithGoogle,
    initializeGoogleAuth,
  };
}; 