# Changelog

## Unreleased

- harden the Expo/Metro development dependency tree by overriding `uuid` to a
  patched CommonJS-compatible release and patching zero-length ICNS entries in
  the unresolved upstream `image-size` advisory;

## 0.1.0 — 2026-08-09

Initial open-source Sparframe Core release candidate:

- provider-neutral contracts for extensions, services, persistence, and sync;
- shared foundation registry, composition, lifecycle, and development adapters;
- generic web and Expo/React Native reference shells;
- deterministic source-level extension discovery and generated catalogs; and
- the `sparframe` CLI with an empty, runnable app template.

The source repository is public on GitHub. npm publication is intentionally
deferred for now.
