# Sparframe CLI

The CLI is the app boundary for Sparframe. It keeps the common workflow small
while leaving the workspace open for agents and developers to extend.

```text
npx sparframe init my-app   create a new workspace
npx sparframe build         sync extensions and build web/mobile checks
npx sparframe start         sync extensions and run the web shell
npx sparframe sync          explicitly inspect and repair the generated catalog
npx sparframe update        update the configured Sparframe base packages
```

`init` scaffolds the workspace and does not start a server. By default it also
runs the package install; use `--skip-install` from tooling when the workspace
will be installed separately. The core template starts with no extensions.

Extensions are discovered automatically from `extensions/`. There is no
extension registration command and no foundation source file to edit. Add a
package with the Sparframe manifest fields, then `start` and `build` refresh the
generated catalog as part of their normal pipeline. `sync` is for debugging,
inspection, and repairing generated output when needed.

The generated catalog is ordinary source code so web bundlers, mobile bundlers,
tests, and agents can inspect it statically. It should be committed to the app
repository. The CLI does not create a marketplace or impose a remote extension
installation model.

`update` uses the app's `basePackages` list to update the framework packages.
The app remains the owner of its extensions and application code; a base update
must not rewrite those files.
