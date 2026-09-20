# CloverUI

CloverHub's shared, mobile-friendly presentation layer built on Obsidian.

CloverUI provides styled groupboxes, searchable pickers, sliders, cards,
notifications, responsive sizing, and touch-friendly controls. It uses the host's
existing Obsidian instance; it is not a standalone automation or authentication
system.

## Release 1.0.0

- [Versioned UI module](release/1.0.0/cloverui.lua)
- [Release manifest](release/1.0.0/MANIFEST.txt)
- Required Obsidian revision: `fa7be5477c30e4a302cc60c85e93ecca926d297b`
- SHA-256: `e2cf84a9b4b4741b0dc2dcd9805566c969e9cf4e5f8d71a0440e72929f500bec`

Use the versioned release artifact for distribution. Preserve its exact bytes
and verify its hash against the manifest. Pin downloads to a specific Git commit
or an immutable release URL rather than a moving branch. Publish changes under a
new version; do not replace an existing release.

The root `cloverui.lua` is the development copy. This module is not interchangeable
with a cache file that returns a table of dependency source strings.

## Repository scope

Publish only UI source, release artifacts, and public documentation here.
Keep automation payloads, local integration builds, credentials, and private
application logic outside this repository.

The extraction/build scripts are internal development utilities that depend on
a separate local source tree; they are not required to load a published release.
