import { RouteRecordRaw } from 'vue-router';
import { pluginRegistry } from '../core/PluginRegistry';
import PluginContainer from '../components/PluginContainer.vue';
import { logger } from '@/utils/logger';

export function generatePluginRoutes(): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [];
  
  // Add a catch-all route for all plugin paths
  routes.push({
    path: '/plugins/:pluginId/:pathMatch(.*)*',
    name: 'PluginRoute',
    component: PluginContainer,
    meta: {
      requiresAuth: true,
      isPluginRoute: true,
    },
  });

  return routes;
}

export function validatePluginRoute(pluginId: string, route: string): boolean {
  // Check if route starts with /plugins/{pluginId}/
  if (!route.startsWith(`/plugins/${pluginId}/`)) {
    return false;
  }

  // Check for route conflicts with other plugins
  const allPlugins = pluginRegistry.getAllPlugins();
  for (const plugin of allPlugins) {
    if (plugin.registration.id === pluginId) continue;
    
    for (const menuItem of plugin.registration.menuItems) {
      if (menuItem.route === route) {
        logger.error('PluginRoutes', `Route conflict detected: ${route} is already used by plugin ${plugin.registration.id}`);
        return false;
      }
    }
  }

  return true;
}
