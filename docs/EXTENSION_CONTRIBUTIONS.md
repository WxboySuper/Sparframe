# Extension contributions

Issue #43 defines the contract between an extension and a shell for actual
pages, panels, and actions. A surface declaration says that a surface exists;
an `ExtensionContribution` supplies the shell-specific implementation behind
that surface.

## Boundary

`@sparframe/contracts` owns the provider-neutral shape:

- `id`, `surfaceId`, and `kind` identify the contribution.
- `shell` identifies the shell that can interpret it.
- `implementation` is intentionally opaque to the foundation.
- `ContributionContext` is the provider-neutral invocation context.

The foundation can discover and associate contributions with declared surfaces,
but it never imports React, React Native, a router, or a renderer. A shell
adapter owns those decisions.

## Extension package layout

An extension may keep platform implementations in separate entry points:

```text
extensions/example-capability/src/
├─ index.ts       # domain behavior, declarations, and shared contributions
├─ web.tsx        # React web page/panel/action implementations
└─ mobile.tsx     # React Native page/panel/action implementations
```

The example extension demonstrates page and action contributions across the
contract and includes a web-only action. The generated web and mobile catalogs
replace the provider-neutral fallback contributions with the matching
platform entrypoint, so each shell receives its own implementation without
editing shell source.

## Contribution rules

- Every contribution must point at a declared surface using the stable surface
  identifier returned by `discoverSurfaces`.
- A page or panel should expose a view implementation; an action should expose
  an invokable implementation.
- Web and mobile may share an implementation when appropriate, but they may
  also provide distinct implementations.
- Shell adapters own routing, navigation, rendering, and event dispatch.
- Service injection and persistence/auth access are separate concerns and are
  intentionally not part of this contract.

## Executable actions

An action contribution may provide a shell renderer plus an `execute` handler:

```ts
const action = {
  render: RunButton,
  execute: async (context, input) => {
    await context.services.persistence.write({
      address: { namespace: 'example', key: 'last-run' },
      value: input ?? null,
    });
  },
};
```

The foundation does not render the action. It exposes `registry.invokeAction`,
and the shell adapter supplies that bridge through `ContributionContext.invoke`.
This keeps action execution extension-owned while making buttons and other
shell controls real, testable operations rather than decorative UI.

This is source-level composition for an application workspace. It is not a
marketplace or a remote runtime loading mechanism.
