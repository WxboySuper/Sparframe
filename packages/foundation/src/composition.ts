import type { ShellCompositionStatus, ShellId } from '@sparframe/contracts';
import {
  ExtensionRegistry,
  type DiscoveredSurface,
  type SurfaceDiscoveryOptions,
} from './registry.ts';

export interface ShellCompositionOptions extends SurfaceDiscoveryOptions {
  /** Surface identifiers requested by shell configuration, if any. */
  readonly requested?: readonly string[];
}

export interface ShellCompositionResult {
  readonly shell: ShellId;
  readonly status: Exclude<ShellCompositionStatus, 'loading'>;
  readonly surfaces: readonly DiscoveredSurface[];
  readonly unsupportedSurfaceIds: readonly string[];
}

export interface ShellNavigationItem {
  readonly id: string;
  readonly label: string;
  readonly route?: string;
  readonly group?: string;
  readonly pinned: boolean;
  readonly order?: number;
}

/** Projects discovered page surfaces into the shell navigation model. */
export function createShellNavigation(
  composition: ShellCompositionResult,
): readonly ShellNavigationItem[] {
  return composition.surfaces
    .filter(({ declaration }) => declaration.kind === 'page')
    .map(({ id, declaration, target }) => ({
      id,
      label: target.navigation?.label ?? declaration.label,
      route: target.route,
      group: target.navigation?.group,
      pinned: target.navigation?.pinned ?? false,
      order: target.navigation?.order,
    }));
}

/**
 * Resolves the shell-neutral surface model that a web or mobile shell renders.
 * It does not load components, choose a route, or mutate the registry.
 */
export function composeShell(
  registry: ExtensionRegistry,
  shell: ShellId,
  options: ShellCompositionOptions = {},
): ShellCompositionResult {
  const surfaces = registry.discoverSurfaces(shell, options);
  const discoveredIds = new Set(surfaces.map((surface) => surface.id));
  const unsupportedSurfaceIds = (options.requested ?? []).filter(
    (surfaceId) => !discoveredIds.has(surfaceId),
  );

  let status: ShellCompositionResult['status'] = surfaces.length > 0 ? 'ready' : 'empty';
  if (surfaces.length === 0 && unsupportedSurfaceIds.length > 0) {
    status = 'unsupported';
  }

  return { shell, status, surfaces, unsupportedSurfaceIds };
}
