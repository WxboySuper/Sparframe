# Sparframe app scaffold

This directory documents the generated project structure for a new Sparframe
application. New applications should be created with `npx sparframe init
my-app`; this remains a readable reference for agents and developers.

```text
my-sparframe-app/
├─ apps/
│  ├─ web/
│  │  ├─ src/
│  │  │  ├─ composition.ts
│  │  │  └─ ...
│  │  └─ package.json
│  └─ mobile/
│     ├─ composition.ts
│     └─ package.json
├─ packages/
│  ├─ contracts/
│  ├─ foundation/
│  ├─ design/
│  └─ extension-catalog/           # Generated from the app's extensions
├─ extensions/                     # Empty in the starter
├─ package.json
├─ pnpm-workspace.yaml
└─ sparframe.json
```

## First extension checklist

- Keep domain types, behavior, and tests in the extension package.
- Export a manifest through the extension package entrypoint.
- Declare the surfaces and shells the extension supports.
- Add `sparframe` metadata to the extension package and regenerate the static
  catalog; do not edit shell entrypoints or maintain extension arrays.
- Add web and/or mobile presentation code only where the extension needs it.
- Document which shared contracts and services it consumes.
- Run `pnpm check:architecture` and the normal workspace checks.

See [`docs/APP_STRUCTURE.md`](../../docs/APP_STRUCTURE.md) for the complete
boundary rules and [`docs/EXTENSION_REGISTRATION.md`](../../docs/EXTENSION_REGISTRATION.md)
for the configuration seam.
