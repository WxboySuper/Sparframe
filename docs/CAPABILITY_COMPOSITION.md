# Capability Composition Contract

**Status:** Shared discovery, composition, lifecycle, and action bridge implemented

Sparframe extensions contribute capabilities. A capability describes platform
behavior and may declare zero or more semantic surfaces. A surface is metadata,
not a web or React Native component. This keeps the foundation independent from
both shells and from vendor providers.

## Boundary

```text
extension
  └─ capability
       └─ surface declaration
            └─ shell target (route and optional navigation metadata)
```

The contracts package owns these provider-neutral types. The foundation registry
owns discovery and configuration. A shell is responsible for deciding how a
discovered target is rendered; it does not need to import another shell's UI.

An extension or capability may have no surfaces. That represents a non-visual
capability such as a data source or service. A surface may target web, mobile,
both, or neither. Different targets can provide different routes or navigation
metadata for the same semantic surface.

## Discovery behavior

`ExtensionRegistry.discoverSurfaces(shell)` returns surfaces whose extension and
target support the requested shell. Results have a stable composite identifier:

```text
extension-id:capability-id:surface-id
```

Callers can pass `hidden` identifiers and an explicit `order` list. Explicit
configuration wins over declaration order; remaining surfaces use their optional
navigation order and then retain discovery order. The registry only returns
metadata and never imports or renders shell UI.

This is intentionally not a component or routing system. `composeShell` turns
the registry result into a shell-neutral composition result. It reports `ready`
when surfaces are available, `empty` when the shell has no visible surfaces, and
`unsupported` when requested configured surfaces cannot target that shell. A
shell may expose `loading` while it activates extensions or loads configuration;
the foundation does not pretend that synchronous discovery represents that
runtime state.

The web and mobile applications each have an explicit composition entrypoint
and use `startShellRuntime` for the same lifecycle sequence: compose visible
surfaces, activate only extensions supported by that shell, expose runtime
status, and deactivate in reverse order. The runtime also binds action
invocation to the host's service context. A shell may render a failure state
without inventing a second lifecycle implementation.

The web and mobile applications each have an explicit composition entrypoint.
They consume the same result but render it differently: web uses discovered page
targets for navigation links, while mobile presents discovered pages using
native layout primitives. Neither shell imports the other shell's UI or
requires every extension to provide a page.
