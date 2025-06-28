import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { AuthConfig } from './types.js';

export class AuthManager {
  private supabaseClient: SupabaseClient;
  private authenticatedUser: User | null = null;
  private refreshToken: string | null = null;

  constructor(private config: AuthConfig) {
    // Initialize with anonymous key first
    this.supabaseClient = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false, // Don't persist in server environment
        detectSessionInUrl: false
      }
    });
  }

  /**
   * Authenticate user with email and password
   * Returns authenticated Supabase client
   */
  async authenticate(): Promise<SupabaseClient> {
    try {
      console.log('🔐 Authenticating user...');
      
      const { data, error } = await this.supabaseClient.auth.signInWithPassword({
        email: this.config.email,
        password: this.config.password
      });

      if (error) {
        throw new Error(`Authentication failed: ${error.message}`);
      }

      if (!data.user || !data.session) {
        throw new Error('Authentication successful but no user session received');
      }

      this.authenticatedUser = data.user;
      this.refreshToken = data.session.refresh_token;
      
      // Create new client with the access token
      this.supabaseClient = createClient(this.config.url, this.config.anonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`
          }
        },
        auth: {
          autoRefreshToken: true,
          persistSession: false,
          detectSessionInUrl: false
        }
      });

      console.log(`✅ Successfully authenticated as: ${data.user.email}`);
      console.log(`🔑 User ID: ${data.user.id}`);
      
      return this.supabaseClient;
    } catch (error) {
      console.error('❌ Authentication error:', error);
      throw error;
    }
  }

  /**
   * Refresh authentication when JWT expires
   * Returns new authenticated Supabase client or null if refresh fails
   */
  async refreshAuthentication(): Promise<SupabaseClient | null> {
    try {
      console.log('🔄 Attempting to refresh authentication...');
      
      // First try to refresh the session if we have a refresh token
      if (this.refreshToken) {
        const { data, error } = await this.supabaseClient.auth.refreshSession({
          refresh_token: this.refreshToken
        });

        if (!error && data.session && data.user) {
          console.log('✅ Session refreshed successfully');
          
          this.authenticatedUser = data.user;
          this.refreshToken = data.session.refresh_token;
          
          // Create new client with refreshed token
          this.supabaseClient = createClient(this.config.url, this.config.anonKey, {
            global: {
              headers: {
                Authorization: `Bearer ${data.session.access_token}`
              }
            },
            auth: {
              autoRefreshToken: true,
              persistSession: false,
              detectSessionInUrl: false
            }
          });
          
          return this.supabaseClient;
        }
      }
      
      // If refresh token doesn't work, try re-authenticating with credentials
      console.log('🔄 Refresh token failed, attempting re-authentication...');
      return await this.authenticate();
      
    } catch (error) {
      console.error('❌ Authentication refresh failed:', error);
      return null;
    }
  }

  /**
   * Force re-authentication (useful for manual refresh)
   */
  async forceReAuthenticate(): Promise<SupabaseClient> {
    console.log('🔄 Force re-authenticating...');
    
    // Clear current state
    this.authenticatedUser = null;
    this.refreshToken = null;
    
    // Re-authenticate from scratch
    return await this.authenticate();
  }

  /**
   * Get the current authenticated user
   */
  getUser(): User | null {
    return this.authenticatedUser;
  }

  /**
   * Get the authenticated Supabase client
   */
  getClient(): SupabaseClient {
    if (!this.authenticatedUser) {
      throw new Error('User not authenticated. Call authenticate() first.');
    }
    return this.supabaseClient;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authenticatedUser !== null;
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      await this.supabaseClient.auth.signOut();
      this.authenticatedUser = null;
      this.refreshToken = null;
      console.log('✅ User signed out successfully');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  }

  /**
   * Get user context information for logging/debugging
   */
  getUserContext(): { userId?: string; email?: string } {
    if (!this.authenticatedUser) {
      return {};
    }
    
    return {
      userId: this.authenticatedUser.id,
      email: this.authenticatedUser.email
    };
  }
} 