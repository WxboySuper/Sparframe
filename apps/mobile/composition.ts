import { discoveredMobileExtensions } from '@sparframe/extension-catalog/mobile';
import {
  composeShell,
  createExtensionRegistry,
  createExtensionServices,
  createShellNavigation,
  startShellRuntime,
} from '@sparframe/foundation';

export const mobileRegistry = createExtensionRegistry({ extensions: discoveredMobileExtensions });
export const mobileServices = createExtensionServices();
export const mobileExtensionContext = { userId: 'local-user', services: mobileServices } as const;

export function startMobileExtensions() {
  return startShellRuntime(mobileRegistry, 'mobile', mobileExtensionContext);
}

export function createMobileComposition() {
  const shell = composeShell(mobileRegistry, 'mobile');
  return {
    ...shell,
    navigation: createShellNavigation(shell),
  };
}
