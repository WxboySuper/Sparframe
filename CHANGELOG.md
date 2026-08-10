# Changelog

## Unreleased

- harden the Expo/Metro development dependency tree by overriding `uuid` to a
  patched CommonJS-compatible release and patching zero-length ICNS entries in
  the unresolved upstream `image-size` advisory;
- align the mobile shell and generated CLI template with Expo SDK 54 for Expo
  Go compatibility;

## 0.1.0 — 2026-08-09

Initial open-source Sparframe Core release candidate:

- provider-neutral contracts for extensions, services, persistence, and sync;
- shared foundation registry, composition, lifecycle, and development adapters;
- generic web and Expo/React Native reference shells;
- deterministic source-level extension discovery and generated catalogs; and
- the `sparframe` CLI with an empty, runnable app template.

The source repository is public on GitHub, and the four public packages are
available on npm at version `0.1.0`.
