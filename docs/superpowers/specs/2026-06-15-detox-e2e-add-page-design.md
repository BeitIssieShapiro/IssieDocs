# Detox E2E: Add Page to Worksheet

**Date:** 2026-06-15
**Status:** Approved
**Replaces:** Maestro approach (blocked by macOS 26.5 beta `devicectl` bug)

## Goal

Re-runnable E2E test on iOS simulator (English) that catches the "add page to existing worksheet fails sometimes" bug. Creates a worksheet, adds a blank page, asserts nav title shows "2/2", then deletes the worksheet.

## Why Detox over Maestro

Maestro 2.x requires `devicectl` which has a broken code signature on macOS 26.5 beta. Detox builds its own XCTest runner linked directly into the app binary — no `devicectl` dependency.

## Stack

- **Detox 20.x** — E2E framework
- **Jest 29** (already installed) as test runner
- **TypeScript** for test file
- **iOS simulator** — iPad (A16), UDID `236048FF-F825-4B8D-8432-6781B32FCE98`
- **Bundle ID:** `com.issieshapiro.issiedoc.IssieDoc`

## Existing testIDs (already in codebase)

All `testID` props were added as part of the Maestro work:

| testID | Element |
|--------|---------|
| `new-page-btn` | New worksheet button in gallery toolbar |
| `editor-more-btn` | More menu button in editor header |
| `header-home-button` | Home button in editor header |
| `worksheet-more-btn-${name}` | More button on each worksheet card |

## New Files

| File | Purpose |
|------|---------|
| `.detoxrc.js` | Detox configuration (sim, bundle ID, build command) |
| `e2e/jest.config.js` | Jest config for E2E tests (separate from unit tests) |
| `e2e/add-page-to-worksheet.test.ts` | The E2E test |

## Xcode Scheme

A new shared scheme `IssieDocs.e2e` is added — duplicate of Debug, used exclusively for Detox builds. This keeps normal debug builds unaffected.

## Podfile Change

Add Detox pod to the `IssieDocs` target:

```ruby
pod 'Detox', :path => '../node_modules/detox/ios'
```

`use_frameworks! :static` is already set — compatible with Detox.

## Test Flow

```
1.  Launch app (no state clear — preserves real user data)
2.  Tap new-page-btn → tap "Blank" in popup
3.  Type "E2E Test Sheet" in Name field → tap "Save"
4.  Assert editor-more-btn visible (editor opened)
5.  Tap editor-more-btn → context menu opens
6.  Tap "Blank" under "Add Page" section
7.  Orientation screen shown → tap "Save" (Portrait default is fine)
8.  Assert text "2/2" visible in nav title  ← catches the bug
9.  Tap header-home-button → return to gallery
10. Tap worksheet-more-btn-E2E Test Sheet
11. Tap "Delete" → tap "Delete" in confirmation
12. Assert "E2E Test Sheet" not visible  ← re-run safe
```

## Assertions

| Step | Detox assertion | Why |
|------|----------------|-----|
| After create | `expect(element(by.id('editor-more-btn'))).toBeVisible()` | Confirms editor opened |
| After add page | `expect(element(by.text('2/2'))).toBeVisible()` | Catches the bug |
| After delete | `expect(element(by.text('E2E Test Sheet'))).not.toBeVisible()` | Re-run safe |

## Running

```bash
# Build (one-time or after native changes)
detox build --configuration ios.sim.debug

# Run tests
detox test --configuration ios.sim.debug
```

## Re-runnability

- No `clearState` — preserves real user data
- Worksheet named "E2E Test Sheet" deleted at end of test
- `afterAll` cleanup runs even if test fails (Detox teardown guarantee)
