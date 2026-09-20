# CloverUI — extraction candidate 1.0.0

The shared presentation layer is extracted from Maintenance r43. It is now wired
into a **separate local test candidate**, not canonical Maintenance. It is not
hosted or installed over the normal cache. Maintenance and the cache are unchanged.

`cloverui.lua` is readable source, not an obfuscated payload. It contains our
existing collapsible headers, theme bindings, shared picker/dropdown binding,
button panels, cards, sliders, metric views, notices, notification queue,
mobile visibility button, responsive sizing, touch scrolling, input/dropdown
patches and presentation polish. No redesign and no Exotic code.

It takes an existing Obsidian library instance; it does not create or download a
second library. Obsidian and its addons remain separate dependencies internally.
The extracted source is **not** a drop-in replacement for r43's cached
`cloverui.lua`, which currently returns a table of dependency source strings.
Do not overwrite that cache manually with this module.

## Integration boundary for step 2

```lua
local UI = CloverUI.Install(Library, {
    IsAlive = sessionAlive,
    Connections = runtimeConnections,
    ConfigControllers = configControllers,
})
local CHK = UI.CHK
```

The host supplies its current session's connection/cleanup registry. Its unload
path must disconnect that registry and unload the Obsidian instance, as it does
today. `UI:Disconnect()` restores its notification wrapper and cancels queued
notifications; Obsidian/GUI destruction owns the existing GUI signal lifecycle.

After host-created window/tabs/groupboxes:

- `UI.StyleWindow(Window)` preserves the current branding, visibility button and DPI behavior.
- `UI.StyleTabs(Window, tabs)` preserves fonts and installs `Window.__ApplyMobileScrollFix` over the explicit tab list.
- `UI.PatchControls(firstGroupbox)` patches the native control methods once.
- `UI.StyleBoxes(groupboxes)` and `UI.Polish()` perform the existing final styling passes.
- Existing helper names are exported on `UI`; list/card helpers remain on `UI.CHK`.

Game-specific tabs, groupbox placement, controls, callbacks, settings persistence,
data collection, movement, remotes, authentication and key checks stay in the host.
No accounts, tokens or gameplay code belong in this module. UI version is `1.0.0`;
the underlying Obsidian revision remains `fa7be5477c30e4a302cc60c85e93ecca926d297b`.

## Checks

From `autoexec/anti`: `node tests/check-cloverui-extraction.mjs`.
The check verifies source extraction against current Maintenance, compilation,
scope, dependency boundaries, mocked lifecycle, mobile behavior and idempotency.
It is not a visual/live-client test. `extract-cloverui.mjs` records the exact source
landmarks and adapters; `--patch` emits an initial-file patch rather than writing
the automation. After integration, freeze/update the provenance check deliberately.

## Local integration test

Build: `node ui/build-local-test.mjs --build`.
Check: `node tests/check-cloverui-integration.mjs` and
`node tests/check-cloverui-extraction.mjs`.
Generated artifacts are `.lua.txt` under `ui/local-test`, so they do not register
as autoexec Lua entry points. Workspace staging uses these exact files:

- `CloverHub/StealAnEgg/ui-test/CloverHub-UI-Test.lua`
- `CloverHub/StealAnEgg/ui-test/cloverui.lua`

Run in Potassium:

```lua
loadstring(readfile("CloverHub/StealAnEgg/ui-test/CloverHub-UI-Test.lua"))()
```

Footer identifies `UI TEST`; build is `2026-09-20-v3.0-cloverui-local-test-r1`.
The candidate checks the external module version before unloading the old hub.
It uses existing saved settings, so turn off unwanted automation before testing.
It is a full local automation candidate, not an isolated UI-only demo. Rejoining
through Auto Execute still loads the hosted release, not this local candidate.

Check the existing PC/mobile layout, tabs (including lazy Account), picker
filters, sliders, Themes/config controls, header collapse and draggable Clover
button; explicitly unload and rerun to check duplicate UI/input handlers.
Re-executing the same ready test is intentionally deduplicated like Maintenance.
Return to the canonical Maintenance script to roll back; it unloads the test.

Integration preserves the full settings/gameplay/features block byte-for-byte.
It also drops the obsolete `spawnBox(true)` orphan left by boss removal from the
candidate only. No canonical edits. Host compile/scope and mocked lifecycle tests
passed; real PC/mobile appearance and reload behavior still need confirmation.
Next: visually validate before promotion, then package/version for the server
owner. No server endpoint or deployment has been changed.
