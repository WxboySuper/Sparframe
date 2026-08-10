# Sparframe package release

The GitHub core repository and the first npm package release are public. The
current release is `0.1.0`.

Sparframe has two release layers:

- `sparframe`: the public CLI and app template.
- `@sparframe/contracts`, `@sparframe/foundation`, and `@sparframe/design`:
  the public runtime packages consumed by generated apps.

The packages are compiled before publishing. Their registry manifests expose
`dist/` rather than repository TypeScript source, while workspace dependencies
use `workspace:^` so local development still links packages and `pnpm pack`
rewrites those ranges to normal semver dependencies.

The mobile reference shell and generated CLI template target Expo SDK 54 so
they can be opened with the matching Expo Go release.

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

After publication, verify the user-facing path from a clean temporary
directory:

```powershell
npx --yes sparframe@0.1.0 init my-app
pnpm --dir my-app build
```

This confirms that the CLI, its template, and all three scoped runtime packages
resolve from the public registry.

Actual registry credentials and publishing are intentionally not part of CI.

## Dependency security

The Expo 54 toolchain currently resolves `uuid` through `xcode` and
`image-size` through Metro. The root package manifest pins `uuid` to the first
patched release that remains compatible with the CommonJS consumer and
overrides PostCSS to a patched release for the Expo Metro config. The resolved
`image-size` package has a local pnpm patch that rejects zero-length ICNS
entries; its box-walking implementation already advances past zero-length JXL
and HEIF boxes.

The upstream advisories do not currently declare a patched `image-size`
release, so `pnpm audit` may continue to report those two advisories even while
the patched checkout is installed. Re-run the audit whenever Expo or Metro is
updated, and remove the local patch as soon as an upstream release fixes the
issue.
