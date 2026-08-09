# Extension registration

Sparframe uses deterministic, generated extension registration. The workspace
scanner discovers packages under `extensions/` that declare `sparframe`
metadata, then emits `@sparframe/extension-catalog`:

```ts
import { discoveredExtensions } from '@sparframe/extension-catalog';
import { createExtensionRegistry } from '@sparframe/foundation';

export const registry = createExtensionRegistry({ extensions: discoveredExtensions });
```

## Boundary

The generated catalog is the only assembly artifact that imports extension
implementations. Shell entrypoints consume the resulting registry and call
`composeShell`; they do not import planning, calendar, authentication, or other
domain extensions directly.

The generator performs deterministic workspace discovery before typecheck and
build. It produces ordinary static imports so Vite and Expo can analyze the
catalog. The foundation does not perform dynamic code loading, install
packages, or provide a marketplace.

Both shells consume the same catalog. An extension can support web, mobile,
both, or neither, subject to its manifest's supported shells. The registry
filters discovered extensions and surfaces by shell; no per-shell extension
array is maintained.

Adding an extension should touch its own package metadata and the generated
catalog output, not foundation or shell source. In a generated app, `start`
and `build` refresh that catalog automatically; `sync` is an explicit
diagnostic command rather than a required registration step.
