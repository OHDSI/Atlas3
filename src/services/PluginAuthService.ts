import { AuthContext } from '@/models/PluginModels';
import { useAuthStore } from '@/stores/auth';

export class PluginAuthService {
  createAuthContext(): AuthContext {
    const authStore = useAuthStore();

    return {
      user: authStore.user ? {
        id: authStore.user.login || '',
        username: authStore.user.displayName || authStore.user.login || '',
        email: authStore.user.email,
        permissions: [], // Convert permissionIdx to array if needed
      } : null,
      token: authStore.token,
      isAuthenticated: authStore.isAuthenticated,
      hasPermission(permission: string): boolean {
        if (!this.user) return false;
        // TODO: Implement proper permission checking with permissionIdx
        return true;
      },
    };
  }

  watchAuthChanges(callback: (context: AuthContext) => void): () => void {
    const authStore = useAuthStore();
    
    // Watch for auth state changes
    const unsubscribe = authStore.$subscribe(() => {
      callback(this.createAuthContext());
    });

    return unsubscribe;
  }
}

export const pluginAuthService = new PluginAuthService();
