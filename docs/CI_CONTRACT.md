# Initial CI Contract

**Status:** Implemented in `.github/workflows/ci.yml`

CI should be small, deterministic, and useful to a solo developer. GitHub Actions is the initial execution environment. Required checks must run without paid hosted build services or provider queues.

## Required Pull Request Checks

Every pull request should run these checks against the workspace:

1. Install dependencies from the committed lockfile.
2. Check formatting.
3. Run lint.
4. Run TypeScript typechecking across workspace packages and applications.
5. Run unit and contract tests.
6. Build the web application.
7. Validate the Expo/React Native application using local repository commands.

The mobile validation must not require EAS, a hosted native build, a paid service, or waiting in a provider queue. It should validate the project configuration and produce a local bundle/export where the project setup supports it.

## Workflow Shape

The initial workflow can use a small number of jobs:

- `quality`: install, formatting, lint, typecheck, and tests
- `web-build`: production web build
- `mobile-validate`: Expo/React Native diagnostics and local validation

The commands are the repository scripts `pnpm format:check`, `pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm build:web`, and
`pnpm validate:mobile`; they are run by the workflow and verified locally as
part of the foundation/shell milestone.

## Merge Rule

The required CI checks must pass before a pull request is merged. Review
decisions remain the maintainer's responsibility and are intentionally not
encoded here as a fixed approval count or review provider.

## Future Checks

Additional checks may be added when they solve a demonstrated problem:

- dependency or secret scanning
- documentation and link validation
- end-to-end browser tests
- Android emulator tests
- iOS or native-device tests
- performance budgets

These are not initial merge requirements. The first CI system should protect the basics without becoming a second project.
