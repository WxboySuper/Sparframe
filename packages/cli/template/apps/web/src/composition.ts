import { discoveredWebExtensions } from '@sparframe/extension-catalog/web';
import {
  composeShell,
  createExtensionRegistry,
  createExtensionServices,
  createShellNavigation,
  startShellRuntime,
} from '@sparframe/foundation';

export const webRegistry = createExtensionRegistry({ extensions: discoveredWebExtensions });
export const webServices = createExtensionServices();
export const webExtensionContext = { userId: 'local-user', services: webServices } as const;

export function startWebExtensions() {
  return startShellRuntime(webRegistry, 'web', webExtensionContext);
}

export function createWebComposition() {
  const shell = composeShell(webRegistry, 'web');
  return {
    ...shell,
    navigation: createShellNavigation(shell),
  };
}
