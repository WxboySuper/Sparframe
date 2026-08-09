# Development Workflow

**Status:** Initial workflow confirmed

Sparframe Core should use a disciplined GitHub workflow from the beginning. The process should catch mistakes without creating process overhead that does not serve the project.

## Git and Pull Requests

- `main` is the stable branch and should not receive direct pushes.
- Every code, configuration, or meaningful documentation change is made on a branch and submitted through a pull request.
- Pull requests should represent one coherent change and remain reasonably small.
- Merging is allowed after the required checks pass and the maintainer has completed whatever review is appropriate for the change.
- This document does not prescribe a specific reviewer, approval count, or review provider. The maintainer owns that decision.
- Squash merging is preferred so `main` retains a readable history.

Suggested branch names are short and descriptive, such as `feat/mobile-capture`, `fix/sync-conflict`, or `docs/architecture-boundary`.

## Required CI Checks

GitHub Actions should run the same core validation expected locally. The initial required checks are:

- dependency installation using the committed lockfile
- formatting check
- lint
- TypeScript typecheck across the workspace
- unit and contract tests
- web production build
- local Expo/React Native validation

Expo validation should use local, repository-controlled checks such as project diagnostics, typechecking, bundling, or export validation. It should not depend on EAS queues, paid services, or hosted build availability.

Security, dependency, documentation, end-to-end, and device-specific checks can be added when the project has a demonstrated need for them. They are not required to make the initial workflow useful.

No pull request should merge with a failing required check.

## Pull Request Descriptions

PR descriptions should be concise and explain the change without becoming an essay. The default structure is:

```markdown
## Summary

<!-- What changed and why? Keep this short. -->

## Checks

- [ ] `pnpm ...`
- [ ] Relevant manual verification

## Notes

<!-- Screenshots, migration notes, risks, or follow-up work. Omit when unnecessary. -->
```

UI changes should include screenshots or a short recording when that makes the result easier to review.

## Agent and Developer Expectations

Before opening a PR:

1. Read the relevant project and architecture documentation.
2. Keep the change within the stated scope.
3. Run the checks that apply locally.
4. Report any skipped checks and why they were skipped.
5. Update documentation when the change alters an architectural decision or development practice.

Agents must not silently weaken CI, bypass the branch workflow, or introduce provider-specific dependencies into the shared foundation to make a feature easier.

## Process Boundaries

The workflow should remain intentionally small. Do not add mandatory review services, complex release automation, paid build infrastructure, or broad quality gates until they solve a real problem for Sparframe.
