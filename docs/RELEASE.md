# Sparframe package release

The GitHub core repository is public. npm publication is prepared but deferred
until the npm account and package ownership are explicitly configured.

Sparframe has two release layers:

- `sparframe`: the public CLI and app template.
- `@sparframe/contracts`, `@sparframe/foundation`, and `@sparframe/design`:
  the public runtime packages consumed by generated apps.

The packages are compiled before publishing. Their registry manifests expose
`dist/` rather than repository TypeScript source, while workspace dependencies
use `workspace:^` so local development still links packages and `pnpm pack`
rewrites those ranges to normal semver dependencies.

## Local verification

```powershell
pnpm check:packages
```

This builds the public runtime packages and packs all four public packages into
a temporary directory. It verifies that the tarballs contain their runtime and
type declaration entrypoints, and that the CLI tarball includes its discovery
module and app template.

## Publishing order

Publish the dependency graph in this order:

1. `@sparframe/contracts`
2. `@sparframe/design`
3. `@sparframe/foundation`
4. `sparframe`

The CLI template's `basePackages` and `devDependencies` then resolve from the
registry. A new base release should update the package versions, run the full
repository checks, run `pnpm check:packages`, and publish the packages from a
reviewed release commit.

Actual registry credentials and publishing are intentionally not part of CI.

## Dependency security

The Expo 57 toolchain currently resolves `uuid` through `xcode` and
`image-size` through Metro. The root package manifest pins `uuid` to the first
patched release that remains compatible with the CommonJS consumer. The
resolved `image-size` package has a local pnpm patch that rejects zero-length
ICNS entries; its box-walking implementation already advances past zero-length
JXL and HEIF boxes.

The upstream advisories do not currently declare a patched `image-size`
release, so `pnpm audit` may continue to report those two advisories even while
the patched checkout is installed. Re-run the audit whenever Expo or Metro is
updated, and remove the local patch as soon as an upstream release fixes the
issue.
