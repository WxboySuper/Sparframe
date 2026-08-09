# Extension authoring path

This is the end-to-end path for adding a source-level extension to a
Sparframe application. The reference implementation is
[`extensions/example-capability`](../extensions/example-capability/README.md).

## 1. Create the package

Create a directory under `extensions/` using the canonical layout:

```text
extensions/<extension-name>/
├─ src/
│  ├─ index.ts
│  └─ index.test.ts
├─ README.md
├─ package.json
└─ tsconfig.json
```

Keep domain types, behavior, adapters, fixtures, and extension-owned tests in
this package. Do not start by editing `packages/contracts`,
`packages/foundation`, `apps`, or a shell entrypoint.

Add discovery metadata to the package manifest:

```json
{
  "sparframe": {
    "id": "example-capability",
    "extensionExport": "exampleCapabilityExtension",
    "contributionEntrypoints": {
      "web": "./web.tsx",
      "mobile": "./mobile.tsx"
    },
    "webContributionExport": "exampleWebContributions",
    "mobileContributionExport": "exampleMobileContributions"
  }
}
```

The export must be a `SparframeExtension` from the package's canonical
`src/index.ts` entrypoint.

## 2. Export the extension declaration

The package entrypoint exports a `SparframeExtension` with a stable manifest:

```ts
import type { SparframeExtension } from '@sparframe/contracts';

export const exampleExtension: SparframeExtension = {
  manifest: {
    id: 'example-capability',
    name: 'Example Capability',
    version: '0.1.0',
    supportedShells: ['web', 'mobile'],
    capabilities: [
      {
        id: 'example-capability',
        name: 'Example Capability',
        surfaces: [
          {
            id: 'example-overview',
            kind: 'page',
            label: 'Example Overview',
            targets: [
              { shell: 'web', route: '#example' },
              { shell: 'mobile', route: 'example' },
            ],
          },
        ],
      },
    ],
  },
};
```

The manifest describes what the extension contributes. It does not load a
component or mutate navigation. Surface targets may differ by shell, and a
surface may be limited to one shell.

## 3. Add behavior and tests

Put extension-specific behavior beside the declaration. Test it without a
shell or application fixture, then test the host boundary by registering the
exported extension with `createExtensionRegistry` and passing that registry to
`composeShell` for each supported shell.

At minimum, verify:

- the manifest has the intended capabilities and surfaces;
- supported shells compose the expected surfaces;
- shell-specific surfaces are not exposed on another shell; and
- unsupported requested surfaces produce the expected composition state.

## 4. Add shell contributions when a surface has UI

Keep platform implementations in `src/web.tsx` and `src/mobile.tsx`, export
the contribution arrays named in the package metadata, and point each
contribution at a declared surface. The generated shell catalogs attach the
matching implementations automatically; the foundation never imports React
or React Native.

## 5. Let the app discover it

No registration command or foundation edit is required. The Sparframe CLI
discovers every extension package with `sparframe` metadata and generates a
statically analyzable catalog consumed by web and mobile whenever the app is
built or started. Run `npx sparframe sync` when you want to inspect or repair
the generated output. The lower-level `pnpm generate:extensions` command is
kept for repository development and CI.

No app configuration file, shell entrypoint, extension array, or individual
extension import needs to be edited. Commit the generated catalog changes with
the extension.

## 6. Validate the package and boundary

Run the extension's checks and then the repository checks:

```powershell
pnpm --filter @sparframe/extension-example-capability lint
pnpm --filter @sparframe/extension-example-capability typecheck
pnpm --filter @sparframe/extension-example-capability test
pnpm check:architecture
pnpm lint
pnpm typecheck
pnpm test
```

If adding the extension requires foundation or shell-source changes, stop and
reassess the boundary. A genuinely shared missing contract may justify a
separate framework PR; domain behavior should remain in the extension.

## Deliberate limits

This path uses deterministic workspace scanning at build time. It does not
imply dynamic remote loading, a marketplace, provider installation, or runtime
code loading. The generated output is ordinary static TypeScript suitable for
both Vite and Expo.
