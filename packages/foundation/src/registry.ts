import type {
  CapabilityManifest,
  ExtensionContext,
  ExtensionInspectionSnapshot,
  ExtensionRuntimeState,
  PersistableValue,
  ShellId,
  SparframeExtension,
  SurfaceDeclaration,
  SurfaceTarget,
} from '@sparframe/contracts';

export interface ExtensionRegistrationConfig {
  /** Extensions selected by the host application for this shell. */
  readonly extensions?: readonly SparframeExtension[];
}

export interface DiscoveredSurface {
  readonly id: string;
  readonly extensionId: string;
  readonly capability: CapabilityManifest;
  readonly declaration: SurfaceDeclaration;
  readonly target: SurfaceTarget;
}

export interface DiscoveredContribution<TImplementation = unknown> {
  readonly id: string;
  readonly extensionId: string;
  readonly surfaceId: string;
  readonly kind: SurfaceDeclaration['kind'];
  readonly shell: ShellId;
  readonly implementation: TImplementation;
}

export interface SurfaceDiscoveryOptions {
  readonly hidden?: readonly string[];
  readonly order?: readonly string[];
  readonly pinned?: readonly string[];
  readonly groups?: readonly { readonly surfaceId: string; readonly group: string }[];
}

export class ExtensionRegistry {
  private readonly extensions = new Map<string, SparframeExtension>();
  private readonly states = new Map<string, ExtensionRuntimeState>();
  private activationOrder: string[] = [];

  register(extension: SparframeExtension): void {
    if (this.extensions.has(extension.manifest.id)) {
      throw new Error(`Extension already registered: ${extension.manifest.id}`);
    }

    if (extension.manifest.dependencies?.some(({ id }) => id === extension.manifest.id)) {
      throw new Error(`Extension cannot depend on itself: ${extension.manifest.id}`);
    }

    this.extensions.set(extension.manifest.id, extension);
    this.states.set(extension.manifest.id, {
      extensionId: extension.manifest.id,
      status: 'registered',
    });
  }

  get(id: string): SparframeExtension | undefined {
    return this.extensions.get(id);
  }

  list(): readonly SparframeExtension[] {
    return [...this.extensions.values()];
  }

  getState(id: string): ExtensionRuntimeState | undefined {
    return this.states.get(id);
  }

  listStates(): readonly ExtensionRuntimeState[] {
    return [...this.states.values()];
  }

  /**
   * Returns a detached, read-only view of registry configuration and runtime
   * state. Extension instances and lifecycle callbacks are intentionally not
   * exposed.
   */
  inspect(): ExtensionInspectionSnapshot {
    return {
      extensions: [...this.extensions.values()].map(({ manifest }) => ({
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        supportedShells: [...manifest.supportedShells],
        dependencies: (manifest.dependencies ?? []).map((dependency) => ({ ...dependency })),
        capabilities: (manifest.capabilities ?? []).map((capability) => ({
          ...capability,
          surfaces: (capability.surfaces ?? []).map((surface) => ({
            ...surface,
            targets: surface.targets.map((target) => ({
              ...target,
              ...(target.navigation ? { navigation: { ...target.navigation } } : {}),
            })),
          })),
        })),
        runtime: { ...this.states.get(manifest.id)! },
      })),
    };
  }

  discoverSurfaces(
    shell: ShellId,
    options: SurfaceDiscoveryOptions = {},
  ): readonly DiscoveredSurface[] {
    const hidden = new Set(options.hidden ?? []);
    const configuredOrder = new Map(
      (options.order ?? []).map((surfaceId, index) => [surfaceId, index]),
    );
    const pinned = new Set(options.pinned ?? []);
    const groups = new Map(
      (options.groups ?? []).map(({ surfaceId, group }) => [surfaceId, group]),
    );
    const surfaces: DiscoveredSurface[] = [];

    for (const extension of this.extensions.values()) {
      if (!extension.manifest.supportedShells.includes(shell)) {
        continue;
      }

      for (const capability of extension.manifest.capabilities ?? []) {
        for (const declaration of capability.surfaces ?? []) {
          const target = declaration.targets.find((candidate) => candidate.shell === shell);

          if (!target) {
            continue;
          }

          const id = `${extension.manifest.id}:${capability.id}:${declaration.id}`;
          if (!hidden.has(id)) {
            const navigation = target.navigation;
            const configuredGroup = groups.get(id);
            const configuredPinned = pinned.has(id);
            const effectiveNavigation =
              navigation || configuredGroup || configuredPinned
                ? {
                    label: navigation?.label ?? declaration.label,
                    ...navigation,
                    ...(configuredGroup ? { group: configuredGroup } : {}),
                    ...(configuredPinned ? { pinned: true } : {}),
                  }
                : undefined;
            surfaces.push({
              id,
              extensionId: extension.manifest.id,
              capability,
              declaration,
              target: effectiveNavigation ? { ...target, navigation: effectiveNavigation } : target,
            });
          }
        }
      }
    }

    return surfaces.sort((left, right) => {
      const leftOrder = configuredOrder.get(left.id);
      const rightOrder = configuredOrder.get(right.id);

      if (leftOrder !== undefined || rightOrder !== undefined) {
        return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER);
      }

      const leftPinned = left.target.navigation?.pinned ? 0 : 1;
      const rightPinned = right.target.navigation?.pinned ? 0 : 1;
      return (
        leftPinned - rightPinned ||
        (left.target.navigation?.order ?? Number.MAX_SAFE_INTEGER) -
          (right.target.navigation?.order ?? Number.MAX_SAFE_INTEGER)
      );
    });
  }

  /**
   * Returns shell-specific implementations without interpreting them. The
   * foundation only associates a contribution with its extension and surface;
   * rendering belongs to the shell adapter.
   */
  discoverContributions<TImplementation = unknown>(
    shell: ShellId,
  ): readonly DiscoveredContribution<TImplementation>[] {
    const declarations = new Map<string, DiscoveredSurface>();

    for (const surface of this.discoverSurfaces(shell)) {
      declarations.set(surface.id, surface);
    }

    const contributions: DiscoveredContribution<TImplementation>[] = [];
    for (const extension of this.extensions.values()) {
      for (const contribution of extension.contributions ?? []) {
        if (contribution.shell !== shell) {
          continue;
        }

        const surface = [...declarations.values()].find(({ id }) => id === contribution.surfaceId);
        if (!surface) {
          continue;
        }

        contributions.push({
          id: `${extension.manifest.id}:${contribution.id}`,
          extensionId: extension.manifest.id,
          surfaceId: surface.id,
          kind: contribution.kind,
          shell,
          implementation: contribution.implementation as TImplementation,
        });
      }
    }

    return contributions;
  }

  async activateAll(
    context: ExtensionContext,
    shell?: ShellId,
  ): Promise<readonly ExtensionRuntimeState[]> {
    const order = this.resolveActivationOrder(shell);
    this.activationOrder = [];

    for (const id of order) {
      const extension = this.extensions.get(id);
      if (!extension) {
        continue;
      }

      const state = this.states.get(id);
      if (state?.status === 'active') {
        this.activationOrder.push(id);
        continue;
      }

      this.setState(id, 'activating');
      try {
        await extension.activate?.({ ...context, extensionId: id });
        this.setState(id, 'active');
        this.activationOrder.push(id);
      } catch (error) {
        this.setState(id, 'failed', error instanceof Error ? error.message : String(error));
        throw error;
      }
    }

    return this.listStates();
  }

  async invokeAction(
    contributionId: string,
    context: ExtensionContext,
    input?: PersistableValue,
  ): Promise<unknown> {
    for (const extension of this.extensions.values()) {
      const contribution = extension.contributions?.find(
        ({ id }) => `${extension.manifest.id}:${id}` === contributionId,
      );
      if (!contribution) continue;
      if (contribution.kind !== 'action')
        throw new Error(`Contribution is not an action: ${contributionId}`);
      const implementation = contribution.implementation as {
        execute?: (
          context: ExtensionContext,
          input?: PersistableValue,
        ) => unknown | Promise<unknown>;
      };
      if (typeof implementation?.execute !== 'function') {
        throw new Error(`Action has no executable implementation: ${contributionId}`);
      }
      return implementation.execute(context, input);
    }
    throw new Error(`Unknown action contribution: ${contributionId}`);
  }

  async deactivateAll(context: ExtensionContext): Promise<readonly ExtensionRuntimeState[]> {
    let firstError: unknown;

    try {
      for (const id of [...this.activationOrder].reverse()) {
        const extension = this.extensions.get(id);
        const state = this.states.get(id);
        if (!extension || state?.status !== 'active') {
          continue;
        }

        this.setState(id, 'deactivating');
        try {
          await extension.deactivate?.({ ...context, extensionId: id });
          this.setState(id, 'inactive');
        } catch (error) {
          this.setState(id, 'failed', error instanceof Error ? error.message : String(error));
          firstError ??= error;
        }
      }
    } finally {
      this.activationOrder = [];
    }

    if (firstError) {
      throw firstError;
    }

    return this.listStates();
  }

  private setState(id: string, status: ExtensionRuntimeState['status'], error?: string): void {
    this.states.set(id, { extensionId: id, status, ...(error ? { error } : {}) });
  }

  private resolveActivationOrder(shell?: ShellId): readonly string[] {
    const order: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (id: string): void => {
      if (visited.has(id)) {
        return;
      }
      if (visiting.has(id)) {
        throw new Error(`Circular extension dependency: ${id}`);
      }

      const extension = this.extensions.get(id);
      if (!extension) {
        throw new Error(`Missing required extension dependency: ${id}`);
      }
      if (shell && !extension.manifest.supportedShells.includes(shell)) {
        throw new Error(`Extension ${id} does not support the ${shell} shell`);
      }

      visiting.add(id);
      for (const dependency of extension.manifest.dependencies ?? []) {
        if (!this.extensions.has(dependency.id) && dependency.optional) {
          continue;
        }
        visit(dependency.id);
      }
      visiting.delete(id);
      visited.add(id);
      order.push(id);
    };

    for (const extension of this.extensions.values()) {
      if (shell && !extension.manifest.supportedShells.includes(shell)) {
        continue;
      }
      visit(extension.manifest.id);
    }

    return order;
  }
}

/**
 * Builds an isolated registry from the generated application catalog.
 *
 * The foundation does not discover packages or load code. A shell or app
 * supplies discovered extensions at this boundary, keeping extension source
 * imports out of shell entrypoints while preserving explicit, reviewable wiring.
 */
export function createExtensionRegistry(
  config: ExtensionRegistrationConfig = {},
): ExtensionRegistry {
  const registry = new ExtensionRegistry();

  for (const extension of config.extensions ?? []) {
    registry.register(extension);
  }

  return registry;
}
