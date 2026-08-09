# Contributing to Sparframe Core

Sparframe Core is developed as a small, source-level framework. Before opening
a change:

1. Read the relevant architecture and boundary documentation.
2. Keep domain behavior and provider SDKs in application-owned extensions.
3. Add or update focused tests and documentation for public contract changes.
4. Run the checks below.

```powershell
pnpm format:check
pnpm check:architecture
pnpm lint
pnpm typecheck
pnpm test
pnpm build:web
pnpm validate:mobile
```

Pull requests should explain the boundary being changed, the verification run,
and any compatibility or migration consequence. Do not add credentials,
personal data, deployment configuration, or application-specific fixtures.
